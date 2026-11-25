# Epic Lounge POS — UI kit

Every screen is composed from these components. **No page builds its own table chrome, date input,
phone input, select, dialog or KPI tile.** If something is missing, add it here (typed props, no
business logic, one component per file) and document it below.

```ts
import { PageHeader, DataTable, KpiCard, DateField, PhoneField, FormDialog } from "@/components/ui";
import { useApiMutation } from "@/hooks/useApiMutation";
import { useConfirm } from "@/hooks/useConfirm";
import { queryKeys, affects } from "@/api/queryKeys";
import { formatUsd, formatDate, formatRelative } from "@/utils/format";
```

Live preview of everything (light/dark, desktop/phone): **`/ui-kit`** (dev server only).

---

## 1. Design rules (from the brief — the theme already enforces most of them)

- IBM Plex Sans everywhere, tabular numbers everywhere, IBM Plex Mono only for codes (`CodeText`).
  Body 15px, nothing below 13px.
- Zinc neutrals + **one** teal accent. Teal = the main action on a screen (one contained button),
  the active nav item, selected states. Status colours only for meaning (`StatusChip`).
  Never violet/indigo, never gradients, glows, glass, emoji icons or decorative colour stripes.
- Radius 8 (controls) / 12 (cards, dialogs). 1px borders. Shadows only on menus, popovers, dialogs.
- One level of cards. Prefer `SectionCard variant="plain"` + dividers over cards inside cards.
- Touch targets ≥ 44px. Primary actions have text ("Charge", "Start session", "Print receipt").
  Icon-only buttons: `<Tooltip title="Print receipt"><IconButton aria-label="Print receipt">`.
- Buttons: `variant="contained"` = the one main action; `variant="outlined"` = secondary (neutral
  grey in this theme); `variant="text"` = tertiary links ("View all"); `color="error"` = destructive.
- Write plain, short copy for older staff: "Unpaid", "Start session", "Couldn't save — check the phone number".

## 2. Loading rule (applies to every screen)

**Page chrome never waits for data.** `PageHeader`, toolbars, filters, tabs, table column headers,
card titles and labels render immediately; **only the data parts** show skeletons.

| Situation | What to render |
|---|---|
| Table, first load (`query.isLoading`) | `DataTable loading` → skeleton rows under the real headers |
| Table, refetch (`query.isFetching`) | `DataTable refreshing` → rows stay, thin top progress bar, Refresh icon spins |
| KPI tile | `KpiCard loading` → only the number + delta skeleton |
| Chart | `ChartCard loading` → only the plot area skeleton |
| Detail panel / card values | `<Skeleton width={80} />` in place of each value, labels stay |
| Error | inline `ErrorState` / `DataTable error` with **Retry** — never a blank page |
| Route change | the shell shows a 2px progress bar while the page chunk loads |

No full-page `LoadingSpinner` / `CircularProgress` except app boot. (`components/common/LoadingSpinner`
is legacy — delete its usages when you migrate a page.)

## 3. Data layer (React Query)

- **One QueryClient** (`src/api/queryClient.ts`): `staleTime` 30s, refetch on window focus/reconnect,
  no retries on 4xx, 2 retries on network/5xx. Don't create other clients or override these per page
  without a reason.
- **Query keys only from the factory** (`src/api/queryKeys.ts`):

  ```ts
  const orders = useQuery({
    queryKey: queryKeys.orders.list(filters),          // ["orders", "list", {…}]
    queryFn: () => salesApi.list(filters),
    placeholderData: keepPreviousData,                  // lists/pagination: keep rows while the next page loads
  });
  useQuery({ queryKey: queryKeys.orders.detail(id), queryFn: () => salesApi.getById(id), enabled: !!id });
  ```

  Domains: `orders, sessions, stations, reservations, customers, products, categories, discounts,
  reports, dashboard, staff, exchangeRate, counts`.
- **Every write goes through `useApiMutation`** with `invalidates`, so every affected screen refreshes:

  ```ts
  const pay = useApiMutation({
    mutationFn: (v: { id: string; data: PaySaleRequest }) => salesApi.pay(v.id, v.data),
    invalidates: affects.order,            // orders, counts, dashboard, reports, customers, sessions, stations, products
    successMessage: "Payment saved",       // toast; errors toast the server's message automatically
    onSuccess: () => setPayOpen(false),
  });
  ```

  Presets in `affects`: `order, session, reservation, station, customer, product, category,
  discount, staff, exchangeRate`. When in doubt, invalidate more.
- Error text for people: `friendlyError(error)` (`@/utils/apiError`) — server validation messages
  pass through, network/5xx errors become "Can't reach the server…".

## 4. Components — when to use what

### Page structure
| Component | Use it for | Key props |
|---|---|---|
| `PageHeader` | Top of every page | `title`, `subtitle?`, `actions?` (primary last), `children?` (tabs/filters row) |
| `SectionCard` | A titled group (list, form section, panel) | `title`, `subtitle?`, `action?`, `divider?`, `flush?` (full-bleed lists), `footer?`, `variant="card" \| "plain"` |
| `FilterBar` | Search + filters + actions row above custom content (DataTable has its own) | `search?`, `children` (filters), `actions?`, `activeCount?`, `onClear?` |
| `EmptyState` | Nothing to show. Say what's missing + next step | `title`, `description?`, `action?`, `icon?`, `compact?` |
| `ErrorState` | A data area failed | `error?` / `message?`, `onRetry?`, `compact?` |
| `SettingRow` | One setting in a settings section: label + plain description left, its control right (stacked on phones), dividers between rows | `label`, `description?`, `children` (Switch, SegmentedControl…), `htmlFor?` |

### Data display
| Component | Use it for | Key props |
|---|---|---|
| `DataTable` | **Every** list/table | see §5 |
| `KpiCard` | One number + change vs previous period | `label`, `value`, `format` (`money` `number` `percent` `duration` `hours` `lbp` or fn), `previous?`, `previousLabel?` ("vs yesterday"), `goodDirection` (`"up"` revenue, `"down"` no-shows/discounts, `"neutral"`), `deltaFormat?`, `sparkline?`, `icon?`, `hint?`, `loading?`, `onClick?` |
| `ChartCard` | Any chart | `title`, `subtitle?`, `action?`, `legend?` (`{label,color,value?,dashed?}`), `height?`, `loading?`, `error?`, `onRetry?`, `empty?` |
| `StatusChip` | Any status | `status`, `kind` (`order` `payment` `session` `reservation` `station` `source` (`pos` Counter / `website` / `reservation` Booking) `stock` `role` `generic`), `label?`, `tone?`, `dot?` |
| `MoneyText` | Every amount | `value`, `currency` (`USD`/`LBP`), `lbp?` (secondary LBP), `lbpLayout?`, `signed?`, `tone` (`default` `sign` `muted`), `strike?`, `compact?` |
| `CodeText` | Invoice numbers, booking codes, SKUs | children |
| `InfoList` | Read-only "label: value" pairs in detail panels (contact, address, notes) | `items` `{label, value, hideEmpty?}`, `loading?` (labels stay, values skeleton), `layout` (`rows` \| `stacked`) |
| `CountryFlag` | Flag next to a country name | `code`, `size?` |

Status labels/colours live **only** in `statusConfig.ts` (`STATUS_MAP`, `getStatusInfo`,
`statusOptions(kind)` for filter options). Orders: `pending` reads "Unpaid".

Charts: use `@mui/x-charts` with `useChartDefaults()` from `@/theme/charts`:

```tsx
const chart = useChartDefaults();
<ChartCard title="Revenue by hour" legend={[{ label: "Today", color: chart.colors.revenue }, { label: "Yesterday", color: chart.colors.previous, dashed: true }]}>
  <LineChart {...chart.line} height={280}
    xAxis={[{ data: hours, scaleType: "point", valueFormatter: chart.hourTick }]}
    yAxis={[{ valueFormatter: chart.moneyTick, width: 56 }]}
    series={[
      { id: "today", data: today, color: chart.colors.revenue, area: true, showMark: false, valueFormatter: chart.money },
      { id: "yesterday", data: yesterday, color: chart.colors.previous, showMark: false, valueFormatter: chart.money },
    ]}
    sx={{ ...chart.line.sx, ...chart.dashed("yesterday") }} />
</ChartCard>
```

Series colours: `chart.colors.pc` (teal, gaming/PC), `.playstation` (blue), `.products` (amber),
`.other` (slate), `.revenue` (teal), `.previous` (grey, dashed). Bars: `{...chart.bar}`; donuts:
`{...chart.pie}` + `series={[{ ...chart.pieSeries, data }]}`. Charts pass `hideLegend` (via the
defaults) — the legend is `ChartCard legend`.

### Inputs (build every form from these — the theme styles plain `TextField` too)
| Component | Use it for | Value |
|---|---|---|
| `TextField` (MUI) | Free text (names, notes) | string |
| `SelectField` | Short fixed lists (≤ ~10) | `value`, `options` `{value,label,icon?}`, `emptyOption?` ("All statuses") |
| `SegmentedControl` | 2–5 big labelled choices (period, status filter, station type) | `value`, `options` `{value,label,icon?,count?}`, `size="large"` on counter screens |
| `SearchField` | Debounced search box | `value` (committed), `onChange` (after 300ms / Enter / clear) |
| `MoneyField` | Prices, amounts | `number \| null`; `currency="USD"` ($ prefix, 2 decimals) or `"LBP"` (suffix, thousands) |
| `QuantityStepper` | Quantities | `number`; `min`, `max`, `size="large"` for touch |
| `NumberField` | Plain numbers with a unit (percent, minutes, days) — digits only, numeric keypad, clamped on blur | `number \| null`; `min`, `max`, `decimals`, `suffix` ("%"), `prefix` |
| `CreatableSelect` | Values that must stay consistent but can grow (station zones): pick one or "Add new zone “Terrace”" — no near-duplicates | `string \| null`; `options` (existing values), `noun` |
| `DateField` | A calendar day | `"YYYY-MM-DD" \| null` (shows "25 Nov 2026"); `minDate`, `maxDate`, `disablePast`, `clearable` |
| `DateTimeField` | Date + time | `Date \| null` (device local time = Beirut on POS devices); `minutesStep` |
| `TimeField` | A time of day (opening hours, booking start) — one tappable list, no clock face | `"HH:mm" \| null` (shows "8:30 PM"); `minutesStep` (default 15) |
| `DateRangeField` | Report/list periods | `{ preset, from, to }` (YYYY-MM-DD, lounge tz); init with `defaultDateRange("today")` from `@/utils/dateRanges` |
| `PhoneField` | Every phone number | in: E.164 or legacy (`value`, `country`); out: `{ e164, country, national, isValid }` → send `e164` as `phone`, `country` as `phoneCountry` |
| `CountrySelect` | Country | ISO-2 (`"LB"`) |
| `CityField` | City / area | `{ city, area? }`; Lebanon = searchable list (`src/data/lebanon-places.ts`), else free text |
| `AddressFields` | A full address | `{ country, city, area?, street? }` (CONTRACT §2) |

Labels always sit on the outline (never placeholder-only). Use `helperText` for hints and errors,
`required` for the asterisk. Fields are 48px (`size="small"` = 44px, for toolbars only).

### Dialogs
| Component | Use it for |
|---|---|
| `FormDialog` | Any form or detail view in a dialog: title + close (×), scrolling content, Cancel / primary. `onSubmit` makes it a real `<form>` (Enter submits). `loading` spins the primary and blocks closing. Full screen on phones automatically. `destructive`, `secondaryActions` (e.g. Delete on the left), `maxWidth` (default `sm`). |
| `useConfirm()` | Yes/no questions from handlers: `if (await confirm({ title: "Cancel this order?", message, confirmLabel: "Cancel order", tone: "danger" }))`. Provider is mounted in `Root.tsx`. |
| `ConfirmDialog` | The same, controlled (when you need `loading` while the action runs). |
| `DetailDrawer` | Details of one record (a customer, an order): slides in from the right, the list stays visible on desktop, full screen on phones; pinned header (`title`, `subtitle`, `headerActions`) and `footer`, scrolling body, `width` (default 560). Edit in a `FormDialog`; look things up here. |

Raw MUI `Dialog` is fine only for special layouts (e.g. a receipt preview) — keep `maxWidth="xs"`
for small centred dialogs (they don't go full screen on phones).

## 5. DataTable

One table for every list. Wraps MUI X DataGrid (MIT) on tablets/desktops — sorting, keyboard
navigation and pagination come for free and pages already know its column model — and renders
**stacked cards on phones** (one card per row: title, subtitle, amount/status on the right, a few
label: value lines, actions at the bottom). Cards beat horizontal scrolling for older users: nothing
is hidden off-screen and every row is one big tap target.

Built in: toolbar (debounced search, your filter controls, **Refresh** with tooltip + spinner,
**Export CSV**, primary action), typed columns, client or server pagination/sorting/search, row
click, optional selection, empty state (with "No matches / Clear search" when filtering), error +
Retry, skeleton rows on first load, progress bar on refetch.

### Column types
`text` · `number` · `money` (`currency`) · `date` ("25 Nov 2026") · `datetime` · `smartDateTime`
("9:41 PM" today, "Yesterday, 9:41 PM", "25 Nov, 9:41 PM") · `time` · `relative` ("5 min ago",
tooltip = exact time) · `duration` (minutes → "1h 30m") · `status` (`statusKind`) · `code` (mono) ·
`actions` (right-aligned, never sorted/exported, clicks don't trigger the row click).

Other column props: `value(row)` accessor, `render(row)` custom cell, `width` (fixed px — also the
minimum, so narrow columns stay narrow) / `flex` / `minWidth`, `align`, `sortable`, `searchable`, `hideBelow: "md" | "lg"` (drop on tablets),
`mobile: "title" | "subtitle" | "end" | "meta" | "hidden"` (role in the phone card), `csv`.

### Server-side example (orders)

```tsx
const [search, setSearch] = useState("");
const [status, setStatus] = useState<"all" | "pending" | "paid">("all");
const [range, setRange] = useState(() => defaultDateRange("today"));
const [page, setPage] = useState({ page: 0, pageSize: 25 });

const filters = { search, status: status === "all" ? undefined : status, from: range.from, to: range.to, page: page.page + 1, limit: page.pageSize };
const q = useQuery({ queryKey: queryKeys.orders.list(filters), queryFn: () => salesApi.list(filters), placeholderData: keepPreviousData });

const columns: DataTableColumn<Order>[] = [
  { field: "invoiceNumber", header: "Invoice", type: "code", width: 150, mobile: "title" },
  { field: "customer", header: "Customer", value: (o) => o.customer?.name ?? "Walk-in", mobile: "subtitle" },
  { field: "source", header: "Source", type: "status", statusKind: "source", hideBelow: "lg" },
  { field: "createdAt", header: "Time", type: "smartDateTime" },
  { field: "status", header: "Status", type: "status", statusKind: "order" },
  { field: "total", header: "Total", type: "money", value: (o) => o.totals.usd },
  { field: "actions", header: "Actions", type: "actions", render: (o) => (
      <Tooltip title="Print receipt"><IconButton size="small" aria-label={`Print receipt ${o.invoiceNumber}`} onClick={() => print(o)}><PrintOutlined /></IconButton></Tooltip>
  ) },
];

<DataTable<Order>
  label="Orders"
  rows={q.data?.data}
  columns={columns}
  loading={q.isLoading}
  refreshing={q.isFetching && !q.isLoading}
  error={q.error}
  onRetry={() => q.refetch()}
  onRefresh={() => q.refetch()}
  search={{ value: search, onChange: (v) => { setSearch(v); setPage((p) => ({ ...p, page: 0 })); }, placeholder: "Invoice, name or phone" }}
  filters={<>
    <SegmentedControl aria-label="Status" value={status} onChange={setStatus}
      options={[{ value: "all", label: "All" }, { value: "pending", label: "Unpaid" }, { value: "paid", label: "Paid" }]} />
    <DateRangeField value={range} onChange={setRange} />
  </>}
  activeFilterCount={status === "all" ? 0 : 1}
  onClearFilters={() => setStatus("all")}
  pagination={{ ...page, rowCount: q.data?.pagination.total ?? 0, onChange: (p, s) => setPage({ page: p, pageSize: s }) }}
  primaryAction={{ label: "New sale", onClick: () => navigate("/sales") }}
  exportCsv={{ filename: `orders-${range.from}`, fetchAll: () => salesApi.list({ ...filters, page: 1, limit: 1000 }).then((r) => r.data) }}
  onRowClick={(o) => setOpenOrderId(o.id)}
  empty={{ title: "No orders in this period", description: "Counter sales, gaming sessions and website orders all show up here." }}
/>
```

### Client-side (small lists: categories, staff, discounts)
Pass all `rows`, `search` (true or `{ placeholder }`), optional `initialSort` and `pageSize`; the
table filters, sorts and pages itself. Omit `pagination` / `onSortChange` / `search.onChange`.

### Domain pickers (`src/components/pickers/`)
Shared fields that know about our data (they query the API), so they live outside the kit:
`CustomerPicker` (search by name/phone or add a new customer with name + `PhoneField`; value is a
`CustomerChoice`, resolve it with `useResolveCustomer` or send name + phone), `ProductPicker`
(searchable product list grouped by category) and `ImageUploadField` (photo upload + preview).

## 6. Formatting (`@/utils/format`)

`formatUsd` "$12.50" · `formatLbp` "1,120,000 LBP" · `formatMoney(v, currency)` · `formatNumber` ·
`formatPercent(12.5)` "12.5%" · `formatDate` "25 Nov 2026" · `formatDateShort` "25 Nov" ·
`formatDayLong` "Tue 25 Nov 2026" · `formatTime` "9:41 PM" · `formatDateTime` ·
`formatSmartDateTime` · `formatDateRange("2026-11-18","2026-11-24")` "18–24 Nov 2026" ·
`formatDuration(90)` "1h 30m" · `formatElapsed(ms)` "1:05:09" · `formatRelative` "5 min ago" ·
`dayKey(date)` "2026-11-25" (lounge day) · `percentChange` · `initials` · `plural`.
All dates/times are shown in **Asia/Beirut**; all helpers return "—" for missing values.
Phones: `formatPhone`, `normalizePhone`, `isValidPhone`, `phoneHref` in `@/utils/phone`.

## 7. Migrating a page (checklist)

1. Imports from `@/components/ui` (the `components/common/*` files are re-exports kept only until
   every page is migrated — `StatCard` → `KpiCard`).
2. Replace `LoadingSpinner`/full-page spinners with component-level `loading` (§2).
3. Tables → `DataTable`; native `type="date"` inputs → `DateField`/`DateRangeField`; phone inputs →
   `PhoneField`; country/city text → `CountrySelect`/`CityField`/`AddressFields`; prices → `MoneyField`.
4. Keys → `queryKeys.*`; `useMutation` → `useApiMutation` with `invalidates: affects.*`.
5. Statuses → `StatusChip kind=…`; money → `MoneyText`/`formatUsd`; dates → `format.ts`.
6. No hard-coded colours, gradients, `secondary.50`-style palette keys or `brand.*` (deprecated).
