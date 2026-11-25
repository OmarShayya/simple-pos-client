# Phase 2 (POS pages) — shared rules for the three page agents

Read in this order: BRIEF.md (incl. "Added requirements from the owner"), CONTRACT.md (esp. "Changes from v1" — the FINAL backend shapes), then the UI kit docs `src/components/ui/README.md` in your worktree (section 7 = migration checklist).

## Where you work
Each agent has its OWN git worktree + local branch (node_modules is symlinked from the main repo — do NOT run npm install / add dependencies; if you truly need a package, ask the coordinator via SendMessage to "main"):
- Orders agent   → /home/user/wt-orders   (branch wt-orders)   ports: mongo 27021, API 3021, POS dev 5181
- Insights agent → /home/user/wt-insights (branch wt-insights) ports: mongo 27022, API 3022, POS dev 5182
- Forms agent    → /home/user/wt-forms    (branch wt-forms)    ports: mongo 27023, API 3023, POS dev 5183
Commit on your branch only (small logical commits, trailer from BRIEF). Never push, never touch the other worktrees or /home/user/simple-pos-client directly.

## Backend
Run the NEW backend from the snapshot (read-only): `/tmp/claude-0/-home-user/1773465b-84e1-5127-8a97-61601c303a6a/scratchpad/pos-api-v2` → `node dist/server.js` with your ports (see BRIEF for env vars). Your own in-memory Mongo: copy `scratchpad/mongo/run.cjs` and change the port.
Seed: `scratchpad/pos-seed/seed.mjs` (API=http://127.0.0.1:<port>/api/v1; check what it creates; fresh DB → first register = admin) + `scratchpad/booking2/seed.mjs` pattern for stations/sessions/bookings (edit port). Add whatever extra data your pages need (via API, or direct Mongo inserts for backdated history) in your scratch folder.
You do NOT own the backend. If you hit a backend bug or a missing field, work around it if trivial in the client, and send a short message to "main" (SendMessage) describing the bug + the exact request/response; the coordinator fixes the backend. Don't wait idle — continue with other parts meanwhile.

## Shared files — do not edit (coordinator merges them)
`src/components/ui/*`, `src/theme/*`, `src/api/queryClient.ts`, `src/api/queryKeys.ts`, `src/hooks/useApiMutation.ts`, `src/utils/format.ts`, `src/components/layout/*`, `main.tsx`.
Exceptions: the Orders agent owns `src/App.tsx` routes and `src/config/sidebarConfig.tsx`.
If the kit is missing something you need, build it inside your own feature folder (e.g. `src/components/orders/…`) in kit style and mention it in your report so the coordinator can promote it; small kit bug → report it. Compose query keys from the existing factory (`[...queryKeys.X.all, "something", params]`) inside your own api/hooks files instead of editing queryKeys.ts. Tell the coordinator which LEGACY_KEYS entries can be removed after your migration.

## Quality bar
- Pages composed only from the kit (DataTable for every table, kit fields for every input, StatusChip/MoneyText/format utils for display). No one-off styled tables/inputs, no native date inputs, no full-page spinners.
- React Query via queryKeys + useApiMutation with correct `invalidates: affects.*` so every affected screen refreshes.
- Clean, typed, small components (feature folder per page: `src/components/<feature>/…`, hooks in `src/hooks/` or the feature folder). Delete dead code/pages you replace.
- Older, non-technical staff: big clear buttons with text labels, plain words, confirm destructive actions, obvious next step.
- Verify: `npx tsc -p tsconfig.json --noEmit`, `npx eslint <your files>` (no new errors), `npm run build`; Playwright flows against your API at 1440×900 and iPhone 13 (light + dark for main screens), no horizontal scroll, no console errors. Look at your screenshots critically.

## Final report (short)
What you changed, decisions, test results, screenshot paths, LEGACY_KEYS that can go, backend issues found, anything needing the coordinator.
