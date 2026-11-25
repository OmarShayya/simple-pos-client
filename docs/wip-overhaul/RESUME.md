# Resume point — POS overhaul (paused by owner)

## Saved state
| Area | Where | Durable? |
|---|---|---|
| Backend (phones E.164, customer auto-link, unified orders, website orders, reports summary, dashboard overview, counts incl. reservationsAttention, customer list filters, orders type comma list) | simple-pos `claude/exciting-allen-26c9gg`, pushed (last 70f6c76) | yes (GitHub) |
| POS design system (theme, sidebar, scrollbars, UI kit, DataTable, query layer) + socket.io-client + SegmentedControl fix | simple-pos-client `claude/exciting-allen-26c9gg`, pushed (last af664a2) | yes (GitHub) |
| POS Orders hub / POS screen / Stations / live website orders | local branch `wt-orders` (worktree /home/user/wt-orders), 4 commits, last = WIP → merged into simple-pos-client `claude/exciting-allen-26c9gg` | yes (GitHub) |
| POS Dashboard + Reports | local branch `wt-insights` (/home/user/wt-insights), 1 WIP commit 8576e08 → merged into simple-pos-client `claude/exciting-allen-26c9gg` | yes (GitHub) |
| POS Customers + all forms + Login/Register | local branch `wt-forms` (/home/user/wt-forms), 3 commits, last = WIP 00d407c → merged into simple-pos-client `claude/exciting-allen-26c9gg` | yes (GitHub) |
| Website: PhoneField, bookings send E.164, menu orders → POST /sales/public | epic-lounge `claude/exciting-allen-26c9gg`, 3 local commits (f121067, ebd3536, 465b23a) on top of PR #3's head | yes — pushed after PR #3 was merged (bbff11f). No PR yet: open it only AFTER the backend PR is deployed (website now sends phoneCountry, which the old backend rejects). |

UPDATE: owner approved pushing. wt-orders, wt-insights and wt-forms were merged (no conflicts) into simple-pos-client `claude/exciting-allen-26c9gg` and pushed. Combined state: tsc clean, `npm run build` passes, eslint 2 errors (down from 19). Plan + handoff docs are committed under `docs/wip-overhaul/` (delete that folder before the final PR).

## Docs (scratchpad, not durable)
plan/BRIEF.md (rules + design direction + owner's added requirements), plan/CONTRACT.md (API; "Changes from v1" = final shapes), plan/PHASE2.md, plan/HANDOFF-orders.md, HANDOFF-insights.md, HANDOFF-forms.md (also copied in each WIP commit body).

## Next steps when resuming
1. (done) helper branches merged + pushed. Resume work directly on `claude/exciting-allen-26c9gg` (worktrees /home/user/wt-* may be gone after the container resets).
2. Finish per handoffs: orders (browser-check DiscountPicker), insights (npm run build, re-run checks, print layout), forms (discount test selector, phone+dark screenshots, build, untested pages: Categories search, Profile, Settings, Login/Register, empty/error states, phone layout).
3. Coordinator follow-ups:
   - Kit: DataTable `width` should imply `minWidth`; date/time picker field height 54px vs 48px; StatusChip `source` needs "reservation"; dark-mode PlayStation blue #60A5FA → #3B82F6; promote kit candidates (TimeField, NumberField, CreatableSelect, DetailDrawer, SettingRow, InfoList, StatList, ShareList, DashboardListRow, CustomerPicker, ProductPicker); PaymentDialog `sx={STRETCH}` → `fullWidth`; App.tsx dark wrapper on /login,/register can go; remove html2pdf.js from package.json; prune LEGACY_KEYS (lists in handoffs).
   - Backend bugs: GET /discounts returns targetId as a stringified doc; clearing a discount date stores null and the active check treats it as expired (match `{endDate: null}`); "+44 7911 123456" with phoneCountry GB stored as GG.
   - PCManagement lock/unlock removed (lock/unlock now = real billed sessions from the Stations screen).
4. Full-stack e2e (website order → POS live toast → order → payment → receipt; station session → order → pay; booking → customer link; reports/dashboard numbers), screenshots, then PRs in order: backend → POS → website.
