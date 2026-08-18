# Testing coverage plan

<!-- docs/plans/2026-08-18-testing-coverage-plan.md -->

`vitest` and Playwright have been configured since early August (`test/README.md`, `test/e2e/README.md`, `docs/architecture/testing.md`), but zero test files exist anywhere in the repo. This is the concrete, prioritized list of what to write first, superseding the stale priority list in `docs/architecture/testing.md` (written 2026-08-08, before the transactions/roles/renewals domains existed).

Philosophy (per standing preference): unit-heavy, e2e selective. Unit-test pure logic broadly; reserve e2e for a handful of flows where the value is in catching *wiring* bugs, not logic bugs — e.g. this session's missing `actionsColumn` on `/associates` (`app/pages/(community)/associates/index.vue`) was a real regression that `pnpm typecheck`/`pnpm lint` both passed cleanly on, and only manual browser inspection caught.

## Tier 1 — `server/utils/*` pure logic (highest priority)

Cheapest to test (no Nuxt runtime, no DOM), and the highest blast radius since bugs here touch money/membership correctness silently behind a toast:

- **`associateRenewals.ts`** — `renewalYearFor` (date → year), and the year-boundary logic inside `ensureRenewalForPayment`/`removeStaleRenewal` (a payment dated Dec 31 vs Jan 1, the `excludePaymentId` exclusion, the "don't un-renew if another Association Fee payment for the same year still exists" guard). This is the function whose output the new "Scaduti" tab and `membership_status` view column both depend on — a bug here is invisible until someone's membership silently flips status.
- **`associateMembershipStatus.ts`** — whatever status-derivation logic still lives server-side (check for drift against the `pauperwave_associates_with_status` view's own `case` expression, since the two must agree).
- **`wantedCards.ts`**, **`leagueDates.ts`**, **`priceRefresh.ts`**, **`transactionPayload.ts`**, **`auditColumns.ts`** — smaller, but each is a real business-logic seam already extracted out of a route handler specifically so it's testable in isolation.

## Tier 2 — `app/utils/*` pure logic

Same reasoning, one layer up (mostly used by `.vue`/composables but themselves framework-free):

- **`permissions.ts`** — gates every route/nav item by role; a regression here is a security bug, not just a display bug.
- **`bestNStandings.ts`**, **`cittadinoPoints.ts`** — scoring/ranking math for the standings pages; wrong output is hard to spot by eye once there are more than a few players.
- **`tournamentTimeRange.ts`**, **`locations/openingHours.ts`**, **`events/eventIcs.ts`** — date/calendar edge cases (midnight rollover, closed days, timezone-in-ICS) that are exactly the kind of thing that's tedious to re-verify by hand every time they're touched.

## Tier 3 — Composables: filters and generic table helpers

Framework-light, mockable without a running Nuxt app:

- **`useTransactionsFilters.ts`**, **`useWantedCardsFilters.ts`**, **`useEventsFilters.ts`**, **`useLeaguesFilters.ts`**, **`useCittadinoFilters.ts`** — each owns a `filteredX` predicate that both the table and grid/card view depend on; drift between the two views was already a real bug class once (wanted-cards, pre-unification).
- **`useColumnVisibilityItems.ts`**, **`useGroupedSelectColumn.ts`**, **`useSelection.ts`** — generic, shared across every domain table; a bug here is silently everywhere at once.

## Tier 4 — Composables that call Supabase directly

Lower priority: `vitest.config.ts`'s auto-import mirror does **not** cover Nuxt runtime composables (`useSupabaseClient`, `useRoute`, `useAsyncData`, ...) — see the comment in `vitest.config.ts` — so every `use<Domain>Query.ts` needs a hand-mocked Supabase client per test. Worth doing eventually (this is where the `membership_request_status`/`request_status` field-name-drift bug lived, per `docs/architecture/testing.md`), but each one costs more to set up than Tiers 1–3 combined. Do these once Tiers 1–3 are in place and the mocking pattern has been proven once, not first.

## Tier 5 — E2E (Playwright), explicitly small

`test/e2e/README.md` already flags the blocker: login is Supabase magic-link OTP, and there's no auth-setup project / bypass strategy yet. Until that's solved, no e2e spec can run past `/login`. Once it is, the list should stay short — 3–4 flows, not page-by-page coverage:

1. Login → land on `/associates` (proves the auth-stub strategy itself works).
2. Approve a pending associate request (`/associates/requests`) and confirm it appears on the roster.
3. Create an "Association Fee" transaction and confirm the associate's `membership_status`/renewal reflects it (proves the full write path: BFF → `pauperwave_payments` → `pauperwave_associate_renewals` → view).
4. Change a wanted-card's status and confirm the audit columns (`updated_by`/`updated_at`) update.

## Explicitly not prioritized

- `use<Domain>TableColumns.ts` files — mostly `h()`-based cell/render wiring, not logic; a snapshot test would just re-encode the markup, and real regressions here (like the missing-column bug) are wiring mistakes an e2e or manual check catches better than a unit test would.
- `useCittadinoTableColumns.ts` / `useFormatStandingsTableColumns.ts`'s matrix-header chip rendering — same reasoning, plus it's genuinely fiddly DOM-measurement code (see the pinned-column-width comments in that file) that's easier to eyeball than to assert on.
- Anything under still-mock-data pages (`events`, parts of `tournaments`) — no point testing logic that's going to be rewritten once real Supabase tables land (`useEventsTableColumns.ts`'s own header comment already flags this).

## Suggested sequencing

Start with Tier 1's `associateRenewals.ts` — it's the smallest, highest-risk, already-isolated file, and a good template for the mocking pattern (or lack thereof, since it's framework-free) the rest of Tier 1/2 will reuse.
