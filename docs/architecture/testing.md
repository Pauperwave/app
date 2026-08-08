# Testing

<!-- docs/architecture/testing.md -->

## Current state: runner configured, zero tests written

`vitest` and `Playwright` are configured (mirroring `MagicTheGathering/league`) — `pnpm test`/`test:watch`/`test:coverage` and `pnpm test:e2e`/`test:e2e:headed` scripts exist, see `test/README.md` and `test/e2e/README.md`. But **no test file exists anywhere in the repo** — the runner being wired up is not the same as having coverage. Every verification of every feature built this session (wanted-cards CRUD, filters, tour, Pinia Colada migration, audit columns) was done manually via browser, not via an automated test.

The only *automated* verification available today is:

- `pnpm lint` (ESLint) — style/convention correctness, not behavior
- `pnpm typecheck` (`nuxt typecheck` / `vue-tsc`) — type correctness, not behavior

Both must be clean per the zero-warning policy, but **neither catches logic or regression bugs** — e.g. the `membership_request_status`/`request_status` field-name mismatch fixed 2026-08-05 (see `docs/architecture/database.md`) passed typecheck for months because `useAssociates.ts` didn't type its Supabase query result against the generated schema; a `resolveComponent()`-in-a-`.ts`-composable bug found 2026-08-08 (see root `CLAUDE.md`) silently hung the `wanted-cards` table view and neither lint nor typecheck caught it — only manual browser testing did.

## What a first test pass should cover, in priority order

1. **`wanted-cards` BFF endpoints** (`server/api/wanted-cards/*.post.ts`) — the most complex real write path in the app (auth checks, audit columns, status transitions); a regression here fails silently behind a toast unless someone's watching.
2. **`server/api/check-associate.post.ts`** — the one pre-BFF real server route; a regression here breaks login.
3. **`useWantedCardsFilters.ts`'s `filteredCards`** — the single predicate function both the table and grid views now depend on (unified 2026-08-08 specifically to kill a class of bug where the two views' filtering logic drifted apart); the highest-value target for a first unit test given that history.
4. **Composables querying Supabase** (`useAssociates.ts` and any not-yet-migrated ones) — easiest to unit-test with a mocked Supabase client, and where the field-name-drift class of bug lives.

## Not yet decided

- Whether to add E2E coverage (Playwright, per `league`'s convention) given the app's current size doesn't yet justify the setup cost, even though the harness already exists
- Whether writing the first tests belongs in `docs/BACKLOG.md` as a scoped item, or stays a `docs/TODO.md` observation until there's a concrete regression that motivates it — see the note in `docs/BACKLOG.md`/`TODO.md` about this being felt acutely on `/wanted-cards` specifically
