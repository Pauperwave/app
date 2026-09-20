# Testing

<!-- docs/architecture/testing.md -->

## Current state: unit tests in place, no e2e specs yet (updated 2026-09-20)

`vitest` (`pnpm test`, `test:watch`, `test:coverage`) runs 99 test files / 686 tests under `test/unit/` (`utils/` for pure helpers, `composables/` for composables). The first ones landed in late August and the suite has grown with the features: renewals and money math, the round timer, Commander scoring and standings sort, the prize distribution, and the 1v1 Swiss scoring and pairing. There are no component tests yet, and `vitest.config.ts`'s auto-import mirror still doesn't cover Nuxt runtime composables, so composables that query Supabase need a hand-mocked `useSupabaseClient` per test.

`Playwright` is configured (`pnpm test:e2e`, `test:e2e:headed`) but `test/e2e/` has no specs: login is a Supabase magic-link (OTP email) and the auth-stub blocker in `test/e2e/README.md` is still open.

What each automated check catches:

- `pnpm lint` (ESLint) — style/convention correctness, not behavior
- `pnpm typecheck` (`nuxt typecheck` / `vue-tsc`) — type correctness, not behavior
- `pnpm test` — logic of the pure utils and composables that have tests

Lint and typecheck must be clean per the zero-warning policy, but **neither catches logic or regression bugs** — e.g. the `membership_request_status`/`request_status` field-name mismatch fixed 2026-08-05 (see `docs/architecture/database.md`) passed typecheck for months because `useAssociates.ts` didn't type its Supabase query result against the generated schema; a `resolveComponent()`-in-a-`.ts`-composable bug found 2026-08-08 (see root `CLAUDE.md`) silently hung the `wanted-cards` table view and neither lint nor typecheck caught it — only manual browser testing did. Anything wired through a component, a page or an RPC is still verified by hand in the browser.

## What to test next

See `docs/plans/2026-08-18-testing-coverage-plan.md` for the current, concrete, tiered list (this section's own priority list, written 2026-08-08, predates the transactions/roles/renewals domains and is superseded). Short version: unit-test pure `server/utils/*` and `app/utils/*` logic first (cheapest, highest blast radius — e.g. `associateRenewals.ts`'s year-boundary math), then filter composables, then Supabase-querying composables (blocked on hand-mocking `useSupabaseClient` per test, since `vitest.config.ts`'s auto-import mirror doesn't cover Nuxt runtime composables), then a small, fixed set of E2E flows once the magic-link-OTP auth-stub blocker (`test/e2e/README.md`) is solved.

## Not yet decided

- Which flows deserve the first Playwright specs, and how to stub the magic-link login for them (`test/e2e/README.md`).
- Whether to start covering components with real interactive logic (none has a test today).
