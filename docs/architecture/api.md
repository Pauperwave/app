# API routes

<!-- docs/architecture/api.md -->

`server/api/*` inventory: which routes exist, whether they're backed by Supabase or still returning static/mock data, and the BFF (backend-for-frontend) pattern used by newer domains. See root `CLAUDE.md` for the general note that some endpoints are still mock, and ADR-007/008 in `docs/PROGRESS.md` for the architectural decision behind the BFF pattern.

## The BFF pattern (`wanted-cards`, the template for new/migrated domains)

Established 2026-08-08 (ADR-007), replicating `MagicTheGathering/league`'s pattern (its ADR-015) since integration with `league` is imminent (deadline 2026-08-30):

- **Reads** go client-side: a `use<Domain>Query.ts` composable (`useQuery` from Pinia Colada) queries Supabase directly with the anon key. RLS still applies here.
- **Writes** go through a `server/api/<domain>/*.post.ts` endpoint, called via `$fetch` from a `use<Domain>Mutations.ts` composable (`useMutation`). The endpoint uses `serverSupabaseServiceRole`, which **bypasses RLS** — the endpoint itself is the authorization boundary, not a DB policy or trigger. Never call `supabase.from(...).insert/update/delete(...)` directly from a component/composable for a migrated domain.
- Shared server utilities (`server/utils/`, Nitro auto-imports, no explicit import needed):
  - `serverAuth.ts` — `requireUser(event)` (401 if not authenticated), `requireManagementPermission(event)` (403 if `has_management_permissions` RPC returns false; calls `requireUser` first)
  - `auditColumns.ts` — `auditColumnsForInsert(event, user)` / `auditColumnsForUpdate(event, user)`, resolves the acting user's `pauperwave_associates.uuid` via email match and returns `{ created_by, updated_by }` (insert) or `{ updated_by, updated_at }` (update) to spread into the write payload — generic, reusable by any table with those columns (see `docs/architecture/database.md`)
- A gotcha hit while building this: `serverSupabaseUser(event)` resolves the **JWT payload**, not the full Supabase `User` — the user id is the standard JWT `sub` claim (`user.sub`), not `.id` (`undefined`). The user's email is available directly as `user.email` (JWT claim), no extra lookup needed.

### `wanted-cards` endpoints (real, full CRUD)

| Route | Method | Auth | Notes |
|---|---|---|---|
| `server/api/wanted-cards/create.post.ts` | `POST` | `requireUser` | Any authenticated user — players create their own requests |
| `server/api/wanted-cards/[id]/update.post.ts` | `POST` | `requireManagementPermission` | Copies/language/treatment/notes/edition — not card name |
| `server/api/wanted-cards/[id]/status.post.ts` | `POST` | `requireManagementPermission` | Status transition (searching/found/abandoned) |
| `server/api/wanted-cards/[id]/delete.post.ts` | `POST` | `requireManagementPermission` | |

## Other routes

| Route | Method | Backed by | Notes |
|---|---|---|---|
| `server/api/check-associate.post.ts` | `POST` | Supabase (real) | Checks if an email exists in `pauperwave_associates` before `login.vue` calls `signInWithOtp`. Predates the BFF pattern above — uses `@supabase/supabase-js`'s `createClient` directly with `SUPABASE_SERVICE_ROLE_KEY` instead of `serverSupabaseServiceRole`, since it runs unauthenticated, pre-login (no session for `serverSupabase*` helpers to read). |
| `server/api/leagues.ts` | `GET` | Mock | Generates 30 fake leagues in-memory on every request (`Array.from({ length: 30 }, ...)`), not persisted, not read from `leagues` table. |
| `server/api/members.ts` | `GET` | Mock | Hardcoded array of fake members/roles. |
| `server/api/notifications.ts` | `GET` | Mock | Hardcoded array of fake notifications. |
| `server/api/tournaments.ts` | `GET` | Mock | Generates 30 fake tournaments in-memory, same pattern as `leagues.ts`. |

## Known gaps

- **Two data-fetching conventions coexist.** `wanted-cards` uses the BFF pattern above; every other real (non-mock) Supabase read/write in the app still goes through client-side composables calling `useSupabaseClient()` directly (`useAssociates.ts` pattern, see root `CLAUDE.md`), with no server route at all — including writes, which currently rely on RLS alone. Migrating these is tracked in `docs/BACKLOG.md` (P1).
- **Mock routes will need real Supabase-backed replacements** before `leagues`/`tournaments`/`members`/`notifications` pages reflect real data — when they're rebuilt, they should follow the BFF pattern above rather than the pre-2026-08-08 `useAssociates.ts` shape, per ADR-007.
