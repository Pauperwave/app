# API routes

<!-- docs/architecture/api.md -->

`server/api/*` inventory: which routes exist, whether they're backed by Supabase or still returning static/mock data, and known inconsistencies. See root `CLAUDE.md` for the general note that some endpoints are still mock.

## Route inventory

| Route | Method | Backed by | Notes |
|---|---|---|---|
| `server/api/check-associate.post.ts` | `POST` | Supabase (real) | Checks if an email exists in `pauperwave_associates` before `login.vue` calls `signInWithOtp`. Only route using `@supabase/supabase-js`'s `createClient` directly with `SUPABASE_SERVICE_ROLE_KEY` instead of the `useSupabaseClient()` composable — needed here since it runs unauthenticated, pre-login. |
| `server/api/leagues.ts` | `GET` | Mock | Generates 30 fake leagues in-memory on every request (`Array.from({ length: 30 }, ...)`), not persisted, not read from `leagues` table. |
| `server/api/members.ts` | `GET` | Mock | Hardcoded array of fake members/roles. |
| `server/api/notifications.ts` | `GET` | Mock | Hardcoded array of fake notifications. |
| `server/api/tournaments.ts` | `GET` | Mock | Generates 30 fake tournaments in-memory, same pattern as `leagues.ts`. |

## Known gaps

- **No CRUD beyond `check-associate`.** Every other server route is read-only mock data — creating/updating leagues, tournaments, members, or notifications currently happens client-side via `useSupabaseClient()` directly in components (see `AddModal.vue` components under `app/components/*/list/`), not through a server route.
- **Inconsistent auth pattern.** `check-associate.post.ts` is the only route needing pre-auth service-role access; every other real (non-mock) Supabase read in the app goes through client-side composables (`useAssociates.ts` pattern, see root `CLAUDE.md`), not `server/api/*`. There is no established convention yet for *when* a feature should get a dedicated server route vs. a client-side composable — worth deciding before more server routes are added (see the BFF pattern in `MagicTheGathering/league`'s `docs/architecture/api.md` for a possible reference model once this DB becomes that project's base).
- **Mock routes will need real Supabase-backed replacements** before `leagues`/`tournaments`/`members`/`notifications` pages reflect real data — not yet scoped as backlog items.
