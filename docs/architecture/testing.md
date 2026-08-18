# Testing

<!-- docs/architecture/testing.md -->

## Current state: runner configured, zero tests written

`vitest` and `Playwright` are configured (mirroring `MagicTheGathering/league`) — `pnpm test`/`test:watch`/`test:coverage` and `pnpm test:e2e`/`test:e2e:headed` scripts exist, see `test/README.md` and `test/e2e/README.md`. But **no test file exists anywhere in the repo** — the runner being wired up is not the same as having coverage. Every verification of every feature built this session (wanted-cards CRUD, filters, tour, Pinia Colada migration, audit columns) was done manually via browser, not via an automated test.

The only *automated* verification available today is:

- `pnpm lint` (ESLint) — style/convention correctness, not behavior
- `pnpm typecheck` (`nuxt typecheck` / `vue-tsc`) — type correctness, not behavior

Both must be clean per the zero-warning policy, but **neither catches logic or regression bugs** — e.g. the `membership_request_status`/`request_status` field-name mismatch fixed 2026-08-05 (see `docs/architecture/database.md`) passed typecheck for months because `useAssociates.ts` didn't type its Supabase query result against the generated schema; a `resolveComponent()`-in-a-`.ts`-composable bug found 2026-08-08 (see root `CLAUDE.md`) silently hung the `wanted-cards` table view and neither lint nor typecheck caught it — only manual browser testing did.

## What a first test pass should cover, in priority order

See `docs/plans/2026-08-18-testing-coverage-plan.md` for the current, concrete, tiered list (this section's own priority list, written 2026-08-08, predates the transactions/roles/renewals domains and is superseded). Short version: unit-test pure `server/utils/*` and `app/utils/*` logic first (cheapest, highest blast radius — e.g. `associateRenewals.ts`'s year-boundary math), then filter composables, then Supabase-querying composables (blocked on hand-mocking `useSupabaseClient` per test, since `vitest.config.ts`'s auto-import mirror doesn't cover Nuxt runtime composables), then a small, fixed set of E2E flows once the magic-link-OTP auth-stub blocker (`test/e2e/README.md`) is solved.

## Not yet decided

- Whether writing the first tests belongs in `docs/BACKLOG.md` as a scoped item, or stays a `docs/TODO.md` observation until there's a concrete regression that motivates it — see the note in `docs/BACKLOG.md`/`TODO.md` about this being felt acutely on `/wanted-cards` specifically
