# Epic Lounge POS overhaul — shared brief (read fully before starting)

Product: a gaming-lounge POS in Lebanon (PCs + PS5 rooms, snacks/drinks counter, bookings).
Repos (all on branch `claude/exciting-allen-26c9gg`, already in sync with `main`):
- Backend: `/home/user/simple-pos` (Express 5, Mongoose 8, class-validator DTOs via `validateDto`, JWT, socket.io). Build: `npm run build` → `dist/`.
- POS client: `/home/user/simple-pos-client` (React 19, Vite 7, MUI v7, MUI X DataGrid 8, react-query 5, zustand, path alias `@/` → `src/`; type-check with `npx tsc -p tsconfig.json --noEmit` — NOT tsconfig.app.json; build `npm run build`; lint `npx eslint src`).
- Website: `/home/user/epic-lounge` (customer-facing; the owner LIKES its design — functional changes only).

Owner's requests (verbatim intent):
1. POS sidebar redesign; scrollbars must look professional, "not AI slop". Everything should look professionally designed, not AI-made.
2. Fix all components (dates/calendars etc.), consistent, reusable components everywhere.
3. Enhance the Dashboard with real stats.
4. Reports: statistics + graphs; daily / weekly / monthly / yearly each as its own report view.
5. Customers: when someone orders from the website menu or books a PC/PS5 and gives a phone number, auto-create the customer (or link to the existing one).
6. Starting a station session must ALWAYS create an order (sale) containing the gaming session, and the session must always show on the invoice.
7. ONE place for orders: counter sales, gaming sessions and website orders together (no separate "sales history" vs "session history").
8. Senior-level clean code (SOLID, reusable, no duplication). UI/UX must be very easy: many users are older men who barely use technology.
9. All dates use a proper calendar picker. All phone numbers = country-code dropdown + number (store properly in the DB). Any field that shouldn't be free text (country, city/area, station location/zone…) becomes a dropdown/autocomplete.

## Design direction for the POS (decided — follow it, don't average it with other styles)
Why: counter staff (often older) on a desktop/tablet, sometimes a phone. Clarity and legibility beat decoration.
- Light mode is the default for new devices; keep the dark mode toggle working.
- Font: **IBM Plex Sans** (Google Fonts) for all UI; `font-variant-numeric: tabular-nums` for all money/number columns and KPIs; **IBM Plex Mono** only for codes (invoice numbers, booking codes). Base body size 15px; never below 13px.
- Colour: neutral zinc greys for surfaces/text + ONE brand accent, Epic Lounge teal. On light: primary ≈ #0B8A8C (hover #087173), tint #E7F5F5; on dark: #2CC5C7. Semantic colours only for meaning (success green, warning amber, error red, info blue). NO violet/indigo/purple UI colour (an AI tell). For data series: teal (gaming/PC), blue #2563EB (PlayStation), amber #D97706 (products/food), slate for "other".
- NO gradients, NO glows, NO glassmorphism, NO decorative left-edge colour stripes (only if the colour means a status), NO emoji as icons (MUI icons only), no gradient text.
- Radius 8px for controls, 12px for cards/dialogs. 1px borders (light #E4E4E7, dark #27272A). Shadows only on menus/dialogs/popovers.
- Prefer sections + dividers over card-in-card. Cards only when they group an interaction or a KPI.
- Touch targets ≥ 44px; primary actions have text labels (icon-only buttons must have a tooltip AND aria-label). Plain, short copy ("Charge", "Start session", "Print receipt").
- Professional scrollbars: thin (8px), rounded thumb (light #D4D4D8 / dark #3F3F46, darker on hover), transparent track, `scrollbar-gutter: stable` on main scroll areas; Firefox `scrollbar-width: thin` + `scrollbar-color`.
- Sidebar (like mature SaaS admin apps): neutral surface (light #FAFAFA, dark #111113) with a 1px right border; logo + "Epic Lounge" at top; a prominent "New sale" button under the logo; grouped items with small uppercase letter-spaced group labels; 40px rows, 20px icons, active row = teal tint background + teal text + semibold; count badges where useful (open orders, website orders waiting, reservations needing attention); collapsible to a 72px icon rail with tooltips (desktop), drawer on phones; user block at the bottom (name, role, sign out). Sidebar scroll only shows its scrollbar on hover.

## Local test stack (each agent uses ITS OWN ports — don't touch other agents' ports)
- In-memory MongoDB launcher: `/tmp/claude-0/-home-user/1773465b-84e1-5127-8a97-61601c303a6a/scratchpad/mongo/run.cjs` (it hard-codes port 27017 — copy it and change the port). Run long-lived processes with Bash `run_in_background: true` and a long timeout.
- Backend: `cd <backend dir> && PORT=<port> MONGODB_URI=mongodb://127.0.0.1:<mongo port>/pos_dev JWT_SECRET=dev-secret NODE_ENV=development node dist/server.js`
- Fresh DB: the first `POST /api/v1/auth/register` becomes admin (e.g. admin@test.local / Passw0rd!). Example seed (stations, sessions, bookings): `/tmp/claude-0/-home-user/1773465b-84e1-5127-8a97-61601c303a6a/scratchpad/booking2/seed.mjs` (edit the API port). Public endpoints are rate-limited per IP: send a random `X-Forwarded-For` header in test scripts.
- POS dev server: `cd /home/user/simple-pos-client && VITE_API_URL=http://127.0.0.1:<api port>/api/v1 npx vite --port <port> --host 127.0.0.1`
- Playwright + Chromium are preinstalled (`require('playwright')`, `chromium.launch()`); never run `playwright install`. Screenshots you only look at yourself: deviceScaleFactor 1.
- Port allocation: backend agent → mongo 27018, API 3010. POS design-system agent → mongo 27019, API 3011 (using the snapshot build at `/tmp/claude-0/-home-user/1773465b-84e1-5127-8a97-61601c303a6a/scratchpad/pos-api-snap`, NOT the live backend repo), POS dev 5180. Later agents get their own ports from the coordinator.
- Put scratch scripts/screenshots under `/tmp/claude-0/-home-user/1773465b-84e1-5127-8a97-61601c303a6a/scratchpad/<your-agent-name>/`.

## Git rules
- Commit on `claude/exciting-allen-26c9gg` in the repo you own; small logical commits; DO NOT push, DO NOT open PRs (the coordinator does). Never force anything, never rewrite history.
- Commit message trailer (exactly):
  Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_01Ecd8esaCd3Jw4RmmfiJmEh
- Before committing in the POS client run `git checkout -- '*.tsbuildinfo'` if it shows as modified.
- Only touch files in your ownership area (listed in your task). If you need a change elsewhere, note it in your final report instead.

## Final report (keep it short)
What you changed (by area), decisions you made and why, what you tested and the results, anything left undone or needing the coordinator. No code dumps.

## Added requirements from the owner (apply everywhere)
- ONE reusable table component (`DataTable` in the UI kit) for every table: consistent toolbar with search, filters, a Refresh button, empty/error states. No page builds its own table chrome.
- Same for calendars, inputs, selects, dialogs, etc.: pages are composed only from UI-kit components. No one-off styled inputs.
- Loading skeletons: page chrome (headers, toolbars, filters, tabs, table column headers, card titles) renders immediately; ONLY the data parts show skeletons on first load. Refetches keep old data visible with a subtle progress indicator. No full-page spinners (except app boot/auth).
- React Query everywhere via the central query-key factory + `useApiMutation`: every create/update/delete invalidates every affected query so all screens stay in sync without manual reloads.
