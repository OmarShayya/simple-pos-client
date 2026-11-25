# HANDOFF — Forms agent (paused)

Worktree /home/user/wt-forms, branch wt-forms. Commits: bd8bfbf (customers + reservations), 4469f78 (catalog/stations/staff/settings/auth), then this WIP commit (TimeField list labels "8:30 PM" via nested LocalizationProvider dateFormats).

## Done (type-check clean, eslint clean in my area)
- Customers: server DataTable (search name/phone any format/email; filters came-from / balance / last visit incl. custom DateFields; server sort; CSV), add/edit FormDialog (PhoneField, email, AddressFields, notes; duplicate phone -> "Show customer"), detail drawer (GET /customers/:id/activity: KPIs, contact, Orders/Bookings/Sessions DataTables -> /orders?order=<id> and /reservations?date=&highlight=), ?customer=<id> deep link, remove (deactivate) with confirm.
- Reservations: DateField night picker, SegmentedControls, KpiCards, timeline (token colours), DataTable list (check in / edit / no-show / cancel), ?highlight=<id> opens the booking dialog. ReservationDialog = FormDialog with TimeField, SelectField length, slot chips, station chips, CustomerPicker + PhoneField, booking actions. ReservationCard deleted.
- Booking rules: Switch rows, TimeField opening hours, SelectFields instead of number boxes, QuantityStepper, time-zone Autocomplete, sticky save bar.
- Products, Categories, Discounts, Exchange rate, Manage stations (CreatableSelect zones/specs, next number, maintenance/in-use switches; lock/unlock removed — sessions start on the Stations screen), Staff, Profile, Settings, Login/Register (AuthLayout, light default).
- kit-extras (promotion candidates): TimeField, NumberField, CreatableSelect, DetailDrawer, SettingRow, InfoList. Also customers/CustomerPicker, products/ProductPicker, products/ImageUploadField.

## Half-done
- Discount E2E flow: stopped at the calendar step — the test clicked the first "30" gridcell, which is a disabled outside-month day (Oct 30, before minDate). Test-selector issue, not confirmed as an app bug; pick the enabled Nov 30 cell (e.g. `getByRole('gridcell', { name: '30' }).last()`) and re-run.

## Left (ordered)
1. Re-run discount flow: `node scratchpad/forms/flows.cjs discounts`.
2. Phone (iPhone 13) + dark screenshots: Customers (+drawer, +add dialog), Products, Manage stations, Reservations dialog, Login (login phone-dark done). Use `node scratchpad/forms/shot.cjs <route> <name> --phone --dark --wait=4000 [--steps=...]`.
3. Check phone layouts for no horizontal scroll (Reservations filter row, customer toolbar).
4. `npm run build` once.
5. Final report.

## Known issues / notes for coordinator
- Kit: SegmentedControl `fullWidth` + `flexShrink:0` pushes options out of view (only first shows). Picker fields (DateField/TimeField) render ~54px tall vs 48px TextField/SelectField.
- statusConfig `source` lacks "reservation" (I pass label/tone overrides: Booking/primary).
- App.tsx AuthScreen forces dark on /login,/register — AuthLayout overrides with the device theme; the wrapper can be removed.
- Backend: GET /discounts `targetId` is a stringified populated doc (use targetDetails._id); PUT /discounts with startDate/endDate null stores null and the active query ($exists:false) then treats it as expired — use `{endDate: null}` match. "+44 7911 123456" with phoneCountry GB is stored as GG.
- LEGACY_KEYS removable after merge: customers: "customers-all","customer-lookup" (check GamingStations/Sales first); products: "products-list","products-all","products-for-discount"; categories: "categories-list"; reservations: "reservation-settings","reservation-availability"; stations: "gaming-pcs-management","stations-all"; exchangeRate: "exchange-rate-history","convert"; staff: "staff" (only if no other page uses them).

## Tests
flows.cjs: customers 15/15, reservations 8/8, products 6/6, categories 3/3, exchange 1/1, stations 4/4, staff 2/2 PASS; discounts not finished. No console errors except the expected 409.

## Resume
Mongo: `node scratchpad/mongo/run-forms.cjs` (27023). API: `cd scratchpad/pos-api-v2 && PORT=3023 MONGODB_URI=mongodb://127.0.0.1:27023/pos_dev JWT_SECRET=dev-secret NODE_ENV=development node dist/server.js`. Seed: `API=http://127.0.0.1:3023/api/v1 node scratchpad/pos-seed/seed.mjs && node scratchpad/forms/seed-extra.mjs` (admin@epiclounge.lb / password123). POS: `cd /home/user/wt-forms && VITE_API_URL=http://127.0.0.1:3023/api/v1 npx vite --port 5183 --host 127.0.0.1`.
