# HANDOFF — Insights agent (Dashboard + Reports), paused 25 Nov 2026

Worktree /home/user/wt-insights, branch wt-insights (WIP commit "WIP (paused): …"). Not yet `npm run build`-verified; `npx tsc -p tsconfig.json --noEmit` passes, and `npx eslint` on the owned files passes.

## Done
- API/types: `src/api/report.api.ts` (only `getSummary(period, date)`), `src/api/dashboard.api.ts` (only `getOverview()`), `src/types/report.types.ts` (rewritten to the CONTRACT §4 shape), `src/types/dashboard.types.ts` (new, §5). The old report/dashboard endpoints are no longer called from my pages.
- Old report cards are deleted: Daily/Weekly/Monthly/Yearly/CategorySales/ProductSales/DailyTransactions/GamingRevenue. That removes every html2pdf use in the app. The `html2pdf.js` dependency is still in package.json; the coordinator can drop it.
- Reports (`src/pages/Reports.tsx` + `src/components/reports/*`). A Day/Week/Month/Year SegmentedControl, plus PeriodNavigator ("‹ label ›", a Today/This week… jump, and a DateField capped at today). State lives in the URL (`?period=&date=`; bad or future values fall back to today's Day report).
  - There is one shared `ReportView`, and each period is just config (`PERIODS[period].layout` in reportPeriods.ts).
  - KPI row: Revenue (with sparkline and an LBP hint), Paid orders, Average order, Gaming time. Deltas use the API's `comparison` label ("vs last week so far", etc.).
  - Main chart (RevenueChart): bars stacked gaming vs products, with a Revenue/Orders toggle instead of a second axis. Tapping a bar drills into that day or month. Three highlights sit under it: Day = busiest hour, per open hour, gaming share. Week/Month = best day, daily average, quietest day. Year = best month, monthly average, quietest month.
  - "More numbers" StatList (8 secondary KPIs with deltas).
  - Sections: Payments and Categories (ShareList bars), Top products and Staff (DataTable), Stations (PC/PS5 tiles, a horizontal utilization bar chart and a DataTable), Busiest hours heat strip (starts at 6 AM), and a timeline table ("Hour by hour" / "Day by day" / "Best months", ranked for Year, only buckets that have started).
  - EmptyState when the whole period is empty. Cashiers see a "Reports are for managers" EmptyState, and the API is not called for them.
  - Print: `usePrintMode` (light theme via flushSync on beforeprint) and `PrintableReport` (print CSS hides the shell and buttons, adds a paper header). No html2pdf.
  - "Download CSV" in the header produces one CSV with every section. It reuses the table column definitions through the kit's `buildCsv`.
- Dashboard (`src/pages/Dashboard.tsx` + `src/components/dashboard/*`):
  - Greeting, the date, "Updated hh:mm" and a Refresh button.
  - KPIs. Managers: Revenue, Paid orders, Average order, Gaming vs products (split bar). Cashiers: Paid orders, Open orders, Sessions, Stations in use (no money, no "$null").
  - Hourly line chart (today stops at the current hour, yesterday is dashed; managers only).
  - "Stations right now": occupancy bars plus running sessions with live elapsed time and cost. Each session links to `/orders?order=<orderId>`.
  - Open orders: website orders first and flagged, a "Playing" chip, rows link to `/orders?order=id`, "View all" goes to `/orders?status=pending`, and the count comes from `/sales/counts`.
  - Coming up (bookings within 6 h, linking to /reservations), Low stock, Top products today.
  - Refreshes every 30 s. The query key is `queryKeys.dashboard.overview()`, so any `affects.*` invalidates it.
  - Wide screens get two independent columns. Phones get one action-first stack.

## Half-done
- Nothing is mid-edit. The last pending idea: `ReportView.tsx` puts `sx={{ breakInside: "avoid" }}` on each section row. Removing it (keeping it on cards only) would cut the blank space when printing (a week currently prints as 6 A4 pages).

## Left (in order)
1. `npm run build` and a full `npx eslint src` diff against the baseline.
2. Re-run the screenshot set after the last tweaks: `node shoot.cjs shots` (all) plus `node verify.cjs`. Look again at phone dark and cashier phone. Desktop light/dark, phone light and cashier desktop were already reviewed.
3. Print polish (item in Half-done). Optionally make the print layout use 2-column rows.
4. The final report to the coordinator (LEGACY_KEYS, kit notes, backend notes below).

## Known issues / notes for the coordinator
- LEGACY_KEYS: `reports` (daily/weekly/monthly/yearly-report, daily-transactions, product-sales, category-sales, gaming-revenue, gaming-revenue-by-pc) and `dashboard: ["dashboard"]` are no longer read by my pages. They can be removed once Sales, SalesHistory, GamingStations and GamingHistory stop invalidating them by hand (those pages are not mine).
- Kit: `DataTable` column `width` is overridden by the default `minWidth` (100 for numeric columns, 130 for text), so narrow columns need an explicit `minWidth`. Suggest that `width` imply `minWidth`.
- Kit candidates I built in feature folders: `StatList`/`ChangeText` and `ShareList` (reports/), `DashboardListRow`/`DashboardList`/`DashboardListSkeleton` (dashboard/).
- Theme (dataviz validator): in dark mode, playstation #60A5FA vs teal #2CC5C7 has a normal-vision ΔE of 13.5 (below the 15 floor). #3B82F6 passes (ΔE 21). Light mode passes. I add secondary encoding (PC-/PS- codes, legends) anyway.
- Charts: an x axis with a `label` needs `height: 52`, otherwise the tick labels are truncated to "".
- Console: "MUI X Charts: ChartContainer does not have `width`…" appears only while Playwright takes a fullPage screenshot (it resizes the viewport). It does not appear in normal navigation.
- Data: a "closed" day still shows the tail of the previous night (00:00–02:00 payments and sessions), because the API's day is the calendar day. This is expected, not a bug.

## Test status
- `verify.cjs`: ALL PASSED. Checks:
  - KPI, legend, top product and cash numbers equal the API for day/week/month/year.
  - October has 31 rows and September 30.
  - Previous/next/jump navigation updates the URL; Next is disabled on the current period.
  - A year bar opens that month.
  - Empty day and month states, invalid URL fallback.
  - CSV download.
  - PDF print.
  - No page errors.
- Screenshots are in `scratchpad/insights/shots/` (desk-light/dark-*, phone-light/dark-*, cashier-*), with no horizontal overflow at 390 px after the fixes.

## How to resume
- Mongo: `node scratchpad/mongo/run-insights.cjs` (in-memory, port 27022; data is lost when it stops, so re-seed).
- API: `cd scratchpad/pos-api-v2 && PORT=3022 MONGODB_URI=mongodb://127.0.0.1:27022/pos_dev JWT_SECRET=dev-secret NODE_ENV=development node dist/server.js`
- Seed, in order, from `scratchpad/insights/`:
  - `API=http://127.0.0.1:3022/api/v1 node seed-base.mjs`: users (admin@test.local; manager@, cashier@ (Nael), joe@, hiba@; all Passw0rd!), catalogue, 10 PCs + 3 PS5 rooms, a 10:00–02:00 schedule and discounts. Writes base.json.
  - `MONGO=mongodb://127.0.0.1:27022/pos_dev node seed-history.mjs`: about 14.5 months (from 8 Sep 2025 to now) of paid orders, sessions (including legacy sessions with no order), website orders, customers and bookings, inserted directly in Mongo using the backend's document shapes.
  - `API=… MONGO=… node seed-live.mjs`: running sessions (backdated), open and website orders, bookings in the next hours, a PC in maintenance.
- POS: `cd /home/user/wt-insights && VITE_API_URL=http://127.0.0.1:3022/api/v1 npx vite --port 5182 --host 127.0.0.1`
- Checks: `NODE_PATH=$(npm root -g) node scratchpad/insights/shoot.cjs scratchpad/insights/shots [filter]` and `… verify.cjs`.
