# Backend contract (v1) — the backend agent implements this; client agents code against it.
The backend agent may refine details, but must update THIS file (section "Changes from v1") so client agents see the final shapes.
All existing endpoints keep working unless marked removed. Responses keep the existing `{ success, message, data }` envelope.

## 1. Phone numbers
- Stored in E.164 (`+96170123456`) plus `phoneCountry` (ISO-3166 alpha-2, e.g. "LB") where a model has a phone.
- Helper `src/utils/phone.ts` using `libphonenumber-js`: `normalizePhone(input, defaultCountry = "LB") → { e164, country, national } | null`. Accepts "+961 70 123 456", "70123456", "0096170123456", "03 555 777" (LB mobile/landline with/without leading 0).
- DTOs: phone fields accept E.164 or a national number (+ optional `phoneCountry`), are normalized in the service; invalid → 400 "Please enter a valid phone number".
- Startup migration (idempotent, like the existing station-type backfill): normalize existing Customer.phone, Reservation.customerPhone (+ phoneKey) and any other stored phones; assume LB when no country code. Never drop data you can't parse — leave it as-is and log it.
- Reservation lookup/cancel by code + phone must accept any format (compare normalized; keep last-8-digit fallback for legacy rows).

## 2. Customers auto-link
- `customerService.findOrCreateByPhone({ name, phone, phoneCountry?, email? }, { source: "pos" | "website" | "reservation" })` → existing customer by normalized phone (reactivate if inactive; fill name if empty; don't overwrite a staff-edited name) or a new one. Single implementation, used by:
  - public reservation create + staff reservation create (when a phone is given) → `Reservation.customer` ref set
  - website menu order create (below) → `Sale.customer`
  - gaming session start when the staff gives a phone (new optional `customerPhone` on start-session DTO), or `customerId` as today.
- Customer model additions: `phoneCountry`, `source` (first-seen channel), address as `{ country (ISO2), city, area?, street? }` (keep reading the old `{street, city, country}` shape), stats kept as today.
- Avoid duplicates: index on normalized phone (non-unique is fine if legacy duplicates exist; the service dedupes). `GET /customers?search=` matches name / phone digits (any format) / email.
- `GET /customers/:id/activity` → `{ orders: [...last 20 sales], reservations: [...last 20], sessions: [...last 20], totals: { spentUsd, visits, lastVisit } }`.

## 3. Orders (= sales) — one place for everything
- Sale gains `source: "pos" | "website"` (default "pos"); `cashier` becomes optional (website orders have none); `customer` as today.
- Sale item gains `kind: "product" | "gaming"` (default "product"). Gaming items carry `gamingSession` (ref), `station: { id, pcNumber, name, type }`, `durationMinutes`, and `productName` like "PC-05 · 1h 30m" (PS: "PS-1 · 2h"). `product` is no longer required for gaming items (today it wrongly stores the PC id — migrate old rows: SKU `SESSION-…` → kind gaming).
- Starting a session ALWAYS creates a pending order (or attaches to an existing pending order via `saleId`). The "non-billable / quick mode" (`createSale: false`, `isBillable: false`) is removed for new sessions (accept and ignore the flag; old non-billable rows stay untouched).
- While a session runs, the order's gaming line shows the live cost when fetched (compute on read or keep the existing current-cost endpoint); on end, the line's duration/price is finalized and order totals recomputed (discounts included).
- Payment happens on the ORDER. Existing session payment endpoints must keep working but pay the linked order (session.paymentStatus mirrors the order). Products can be added to an order that contains a running session.
- Website order: `POST /sales/public` (no auth; rate-limited per IP like reservations; honeypot `website` must be empty) body `{ items: [{ productId, quantity }], customerName, customerPhone, phoneCountry?, notes?, website? }` → pending order, `source: "website"`, prices from DB (ignore client prices), only active/available products, customer auto-linked. Response: `{ invoiceNumber, totals, items }`. Emits socket event `order:new` (payload: id, invoiceNumber, customerName, totals) for the POS.
- `GET /sales` (orders list) filters: `status` (pending|paid|cancelled, comma list ok), `source` (pos|website), `type` (gaming|products|mixed), `search` (invoice no., customer name/phone), `from`/`to` (YYYY-MM-DD in lounge timezone), `customerId`, `cashierId`, pagination `page`/`limit`, sort newest first. Each row includes populated customer {id,name,phone}, cashier {id,name}, `hasGaming`, `itemCount`, totals, status, source, createdAt, paidAt.
- `GET /sales/counts` → `{ open, websiteOpen }` for sidebar badges.
- `GET /sales/:id` returns the full order incl. gaming lines (with live cost for a running session) — used for the invoice/receipt.

## 4. Reports (timezone-correct — use the lounge timezone from ReservationSettings / `Asia/Beirut`, never server-local time)
`GET /reports/summary?period=day|week|month|year&date=YYYY-MM-DD` (date = any day inside the period; weeks start Monday). Managers/admins only.
Revenue source of truth = PAID orders by `paidAt` (plus legacy paid sessions that have no order, so old data isn't lost — never double count).
```
{
  period, timezone,
  range:    { start, end, label },      // label e.g. "Tue 25 Nov 2026", "24–30 Nov 2026", "November 2026", "2026"
  previous: { start, end, label },
  kpis: {                               // each { value, previous } ; money in USD (+ lbp where the data has it)
    revenue, orders, avgOrder, gamingRevenue, productRevenue,
    gamingHours, sessions, discounts, newCustomers, websiteOrders, reservations, noShows
  },
  series: [ { key, label, revenue, gaming, products, orders } ],   // day→24 hourly buckets, week→7 days, month→days, year→12 months
  byPaymentMethod: [ { method, amount, count } ],
  byCategory:      [ { category, revenue, quantity } ],
  topProducts:     [ { productId, name, quantity, revenue } ],        // top 10
  stations:        [ { id, pcNumber, name, type, sessions, hours, revenue, utilization } ],  // utilization = booked hours / open hours in range
  byStationType:   { pc: { sessions, hours, revenue }, playstation: { ... } },
  busiestHours:    [ { hour, orders, revenue } ],                  // 0–23, for week/month/year heat strip
  cashiers:        [ { id, name, orders, revenue } ]
}
```
Old report endpoints can stay (unused by the new client) or be removed if nothing uses them — say which in the report.

## 5. Dashboard
`GET /dashboard/overview` (any signed-in staff; hide money totals for cashiers if that's the existing rule):
```
{
  today:     { revenue, orders, avgOrder, gamingRevenue, productRevenue, sessions, newCustomers },   // each { value, previous } where previous = yesterday up to the same time of day
  hourly:    [ { hour, today, yesterday } ],             // revenue per hour (lounge tz)
  stations:  { pc: { total, available, occupied, maintenance }, playstation: { ... } },
  activeSessions: [ { id, station: { pcNumber, name, type }, customerName, startTime, elapsedMinutes, currentCost, orderId } ],
  openOrders:     [ { id, invoiceNumber, source, customerName, totals, createdAt, hasGaming } ],   // pending, newest first, max 10
  upcomingReservations: [ { id, code, customerName, startTime, stations: [pcNumber], status } ],  // next 6 hours
  lowStock:       [ { id, name, stock, threshold } ],
  topProductsToday: [ { name, quantity, revenue } ]
}
```

## Changes from v1
(backend agent: record any deviations here)

Implemented by the backend agent (branch `claude/exciting-allen-26c9gg`, backend repo). Everything in §1–5 exists; below are the exact shapes and every place the implementation differs from or adds to v1.

### §1 Phones
- `normalizePhone()` → `{ e164, country, national }`; `national` = national significant number, digits only (`"70123456"`, `"03 555 777"` → `"3555777"`). Also accepts `"961 70 123 456"` (no `+`).
- Phone fields in DTOs: string ≤ 30 chars + optional `phoneCountry` (exactly 2 letters). Customer `phone` no longer needs ≥ 8 chars. Invalid → **400** `"Please enter a valid phone number"`.
- Customer API responses now include `phone` (E.164), `phoneCountry`, **`phoneNational`** (to prefill a "country + number" input), `source`, `address`, `isActive`.
- `GET /customers/phone/:phone?country=LB` accepts any format.
- Address `country`: ISO2 expected; a country name is also accepted and mapped (`"Lebanon"` → `"LB"`); unknown → 400 `"Please choose a country from the list"`. Old free-text countries are migrated/read as ISO2 when they can be mapped.
- Reservations: staff shape (`GET /reservations`, `/reservations/:id`) adds `phoneCountry` and `customerId`. `customerPhone` is E.164. Public create, staff create, staff update, lookup and cancel all accept optional `phoneCountry`.
- Unparseable legacy phones are left as-is (logged at startup).

### §2 Customers
- Customer `source`: public **and** staff bookings → `"reservation"`, website menu orders → `"website"`, POS (sessions, customers screen) → `"pos"`.
- Name rule: a customer created from a phone only (session start with `customerPhone` and no name) gets a placeholder name `"Guest 1234"` (last 4 digits); the first real name received later replaces it. Any other existing name is never overwritten (stricter than "don't overwrite staff-edited").
- `POST /customers` with the phone of a deactivated customer reactivates that record (with the new details) instead of 409; an active one is still 409.
- `GET /customers?search=` matches name, email, and phone digits in any format (`"70 123"`, `"0096170…"`, `"03555777"`).
- `GET /customers/:id/activity` →
  `{ orders: [OrderRow ×≤20], reservations: [{ id, code, type, status, source, startTime, endTime, durationMinutes, stations: ["PC-01"], estimatedCost }], sessions: [{ id, sessionNumber, station: { pcNumber, name, type }, startTime, endTime, durationMinutes, status, paymentStatus, amount, orderId }], totals: { spentUsd, visits, lastVisit, orders, reservations } }`.
  `OrderRow` = the `GET /sales` row below. `visits` = distinct lounge-local days with a paid order or a session; `totals.orders` = paid orders; `totals.reservations` = non-cancelled bookings. Bookings made before linking are matched by phone.

### §3 Orders
- **Order row** (`GET /sales`, activity, `/sales/today`): `{ id, invoiceNumber, source, status, customer: { id, name, phone } | null, customerName, cashier: { id, name } | null, paidBy: { id, name } | null, hasGaming, hasActiveSessions, itemCount, subtotalBeforeDiscount, totalItemDiscounts, saleDiscount, discountTotal, totals, currentTotals, paymentMethod, paymentCurrency, createdAt, paidAt }`.
  - `cashier` is now an object (it used to be the name string). `paidBy` (new) = staff who took the payment. `customerName` (new) = snapshot (customer name, or the name typed when starting a session).
  - `itemCount` = sum of quantities (a gaming line counts 1).
  - **`totals` is live**: running sessions are priced at "now" (line + order discounts applied). `currentTotals` is the same value, kept for older builds.
- **Order detail** (`GET /sales/:id`, `GET /sales/invoice/:invoiceNumber`): row fields + `cashier: { id, name, email }`, `items`, `activeSessions: [{ sessionId, sessionNumber, currentDuration, currentCost }]`, `amountPaid`, `notes`, `updatedAt`.
  - Line: `{ kind: "product"|"gaming", product, productId (null for gaming), productName, productSku, quantity, unitPrice, discount?, subtotal, finalAmount }`; gaming lines add `{ gamingSession, station: { id, pcNumber, name, type }, durationMinutes, isActive, sessionData }` (`sessionData` = legacy shape for old builds). Gaming lines keep `productSku: "SESSION-<sessionNumber>"`. `discount` is omitted when none.
- Discounts: line and order discounts are stored as percentages and re-applied whenever totals change (an order discount follows the session's final/live cost). Gaming discount: `PUT /gaming/sessions/:id/end { discountId }` (unchanged) or `PATCH /sales/:id { sessionDiscounts: [{ gamingSessionId | productSku, discountId? }] }` (`gamingSessionId` is new; omit `discountId` to remove).
- `PATCH /sales/:id { items }` replaces the **product** lines only; gaming lines stay. Removing every line → 400.
- Start session `POST /gaming/sessions`: body adds `customerPhone?`, `phoneCountry?` (customerId wins if both). `createSale` accepted and ignored. Response adds `orderId` and `sale: { id, invoiceNumber, status, totals }`. All session responses (end, payment, get, list, active) include `orderId`. `isBillable` is always true for new sessions.
- Ending a session (`PUT /gaming/sessions/:id/end`) finalizes the line (`durationMinutes`, price, name `"PC-05 · 1h 30m"`), recomputes totals, frees the station. Order stays pending.
- **Payment**: `POST /sales/:id/pay` and `POST /gaming/sessions/:id/payment` both pay the ORDER: running sessions on it are stopped and billed, then the amount is checked against the total (short → 400 and nothing changes). The session endpoint pays the whole linked order (its products and all its sessions); response `{ id, sessionNumber, totalCost, finalAmount, status, paymentStatus, orderId, sale: { id, invoiceNumber, status, totals } }`. Sessions mirror the order's payment status.
- Cancel session: its line is removed; if it was the only line, the order becomes `cancelled` (line kept for the record).
- `POST /gaming/pcs/:id/lock` / `unlock` (station admin buttons) now start / end a real session, so they bill on an order too.
- Reservation check-in: one pending order **per station** (friends can pay separately), linked to the booking's customer.
- `POST /sales/public` (exact): body `{ items: [{ productId, quantity }] (1–30 items, quantity 1–50), customerName (≤80), customerPhone, phoneCountry?, notes? (≤500), website? }`. Unknown fields (e.g. a client `price`) → 422. Duplicate products are merged. Only `isActive && displayOnMenu` products; stock is reserved like POS orders.
  - 201 → `{ invoiceNumber, status: "pending", totals: { usd, lbp }, items: [{ productId, productName, quantity, unitPrice, subtotal, finalAmount }], createdAt }`.
  - Errors: invalid phone 400 `"Please enter a valid phone number"`; unavailable item 400 `"Some items are no longer available. Please refresh the menu and try again."`; honeypot 400 `"Could not place the order"`; 11th order/hour from one IP 429 `"Too many orders from this device. Please try again later or call us."`.
- **Socket `order:new`** goes only to signed-in POS clients (never to the PC agents): connect with `io(API_ORIGIN, { auth: { token: <JWT> } })` — or emit `"staff:join", { token }` after connecting; the server answers `"staff:joined", { ok }`. Payload: `{ id, invoiceNumber, source, customerName, totals, itemCount, createdAt }`.
- `GET /sales` query: as v1, plus legacy `startDate`/`endDate` (aliases of `from`/`to`); `limit` ≤ 100; invalid values → 400. `search` matches invoice number, `customerName`, and the linked customer's name/phone (any format)/email.
- `GET /sales/counts` (any staff) → `{ open, websiteOpen }`.
- Invoice and session numbers (`YYYYMMDD-NNNN`) now use the lounge-local date.

### §4 Reports — `GET /reports/summary`
- Extra top-level fields: `comparison: "full" | "to-date"` (while the selected period is still running, `previous` is cut to the same elapsed time, e.g. Mon–Wed vs last Mon–Wed) and `openHours` (opening hours in the range from the booking schedule).
- `range` / `previous`: `{ start, end, label }`, `end` exclusive. Labels: `"Tue 25 Nov 2026"`, `"24–30 Nov 2026"` (`"29 Sep – 5 Oct 2025"`, `"29 Dec 2025 – 4 Jan 2026"` across months/years), `"November 2026"`, `"2026"`. `date` defaults to today; it must be a real day (400 otherwise).
- KPI shapes: money → `{ value, previous, lbp: { value, previous } }` (value in USD); counts → `{ value, previous }`. `gamingHours` in hours (2 decimals).
- KPI definitions: `revenue` = paid orders by `paidAt` + legacy sessions paid without an order ("quick mode" sessions excluded, as before); `orders` = number of those; `gamingRevenue` = gaming lines incl. their share of the order discount; `productRevenue` = product lines (gaming + products = revenue exactly); `discounts` = line + order discounts on those orders; `gamingHours` = station occupancy within the range (all non-cancelled sessions, running ones up to now); `sessions` = non-cancelled sessions started in the range; `websiteOrders` = website orders **placed** in the range (not cancelled); `reservations` = bookings starting in the range (not cancelled); `noShows`.
- Products in a category named "Gaming" are product revenue now (the old report counted them as gaming; gaming = station time only).
- `series` (USD): day → key `"00"`…`"23"`, label `"16:00"`; week → key `"2026-11-24"`, label `"Mon 24"`; month → key `"2026-11-24"`, label `"24"`; year → key `"2026-01"`, label `"Jan"`.
- `byPaymentMethod`: `{ method: "cash"|"card"|"bank_transfer"|"unknown" (legacy sessions), amount (USD), amountLbp, count }`, by order total.
- `byCategory`: product lines only (`"Uncategorized"` if the product is gone). `topProducts`: top 10 by revenue.
- `stations`: active stations + any with usage/revenue in the range. `hours` = occupied hours in the range; `utilization` 0–1 (3 decimals) = occupied time inside opening hours ÷ opening hours; `null` when closed the whole range.
- `cashiers`: credited to the staff member who took the payment (`paidBy`), else the order's creator.
- Old report endpoints are **kept** (the current POS uses them) but now read the same ledger/timezone: `/reports/daily|weekly|monthly|yearly`; `gaming/*`, `gaming-revenue(-by-pc)`, `transactions/daily`, `by-category`, `by-product`, `export` resolve days in the lounge timezone (by-category/by-product were returning 500 with any data — fixed). They can be removed once the new client is live. Note: the current client also calls `/reports/discount-usage` and `/reports/customer-discounts`, which have never existed on the backend (404, unchanged).

### §5 Dashboard — `GET /dashboard/overview`
- `/dashboard/overview` now returns the new shape for any signed-in staff. The previous manager-only payload moved to `/dashboard/legacy-overview` (the current client doesn't call either). `/dashboard/today` etc. remain and no longer double-count sessions.
- Extra fields: `canViewRevenue`, `timezone`, `generatedAt`.
- Cashiers (`canViewRevenue: false`): money KPIs are `{ value: null, previous: null }`, `hourly` is `[]`, `topProductsToday[].revenue` is `null`. Order totals and running-session costs stay visible (needed to charge).
- `today.*`: `{ value, previous }`, previous = yesterday from 00:00 to the same time of day (lounge tz).
- `hourly`: 24 entries `{ hour, today, yesterday }` (yesterday = full day).
- `stations.{pc,playstation}` add `reserved`.
- `activeSessions[]` adds `sessionNumber` and `station.id`; `currentCost` includes a discount set on the line.
- `openOrders[]` adds `hasActiveSessions`; `totals` are live; max 10, newest first.
- `upcomingReservations[]`: confirmed bookings starting within 6 h (or started and not yet ended); adds `type`, `endTime`.
- `lowStock`: active physical products flagged low, ≤ 20, lowest stock first. `topProductsToday`: top 5 by revenue.

- (coordinator) `GET /sales/counts` now returns `{ open, websiteOpen, reservationsAttention }` — reservationsAttention = confirmed bookings that are late or start within 30 min.
