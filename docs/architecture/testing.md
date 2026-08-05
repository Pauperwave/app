# Testing

<!-- docs/architecture/testing.md -->

## Current state: no automated tests

There is no test runner configured in this repo (no `vitest`, no `@nuxt/test-utils`, no Playwright, no `*.test.*` files anywhere). Confirmed 2026-08-05 — `package.json` has no `test` script, `pnpm-lock.yaml` has none of the usual testing packages.

The only verification available today is:

- `pnpm lint` (ESLint) — style/convention correctness, not behavior
- `pnpm typecheck` (`nuxt typecheck` / `vue-tsc`) — type correctness, not behavior
- Manual verification in the browser (see root `CLAUDE.md`'s note on testing UI changes manually)

Both must be clean per the zero-warning policy, but **neither catches logic or regression bugs** — e.g. the `membership_request_status`/`request_status` field-name mismatch fixed 2026-08-05 (see `docs/architecture/database.md`) passed typecheck for months because `useAssociates.ts` didn't type its Supabase query result against the generated schema; nothing would have caught the sidebar's hardcoded, disconnected badge counts either.

## What a first testing setup should cover, in priority order

1. **Database migrations** — no automated check today that a migration actually produces the expected `pauperwave_associates_with_status` shape/values. Currently verified manually via `supabase db query --linked` after every push (see `docs/architecture/database.md`).
2. **`server/api/check-associate.post.ts`** — the one real (non-mock) server route; a regression here breaks login.
3. **Composables querying Supabase** (`useAssociates.ts` and future ones) — easiest to unit-test with a mocked Supabase client, and exactly where the field-name-drift class of bug lives.
4. **Table/filter logic in page components** (e.g. `associates/index.vue`'s column filters, sidebar `?status=` wiring) — currently only verified manually in the browser.

## Not yet decided

- Which test runner (`vitest` is the natural fit for a Nuxt 4 project, matching `MagicTheGathering/league`'s setup)
- Whether to add E2E coverage (Playwright, per `league`'s convention) given the app's current size doesn't yet justify the setup cost
- Whether this belongs in `docs/BACKLOG.md` as a scoped item, or stays a `docs/TODO.md` observation until there's a concrete regression that motivates it
