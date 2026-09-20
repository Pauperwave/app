# API routes

<!-- docs/architecture/api.md -->

`server/api/*` inventory: which routes exist, whether they're backed by Supabase or still returning static/mock data, and the BFF (backend-for-frontend) pattern most domains follow. See root `CLAUDE.md` for the data-fetching conventions overview, and ADR-007/008 in `docs/PROGRESS.md` for the architectural decision behind the BFF pattern.

## The BFF pattern

- **Reads** go client-side: a `use<Domain>Query.ts` composable (`useQuery` from Pinia Colada) queries Supabase directly with the anon key. RLS still applies here.
- **Writes** go through a `server/api/<domain>/*.post.ts` endpoint, called via `$fetch` from a `use<Domain>Mutations.ts` composable (`useMutation`). The endpoint uses `serverSupabaseServiceRole`, which **bypasses RLS** — the endpoint itself is the authorization boundary, not a DB policy or trigger. Never call `supabase.from(...).insert/update/delete(...)` directly from a component/composable for a migrated domain.
- Shared server utilities (`server/utils/`, Nitro auto-imports, no explicit import needed):
  - `serverAuth.ts` — `requireUser(event)` (401 if not authenticated), `requireManagementPermission(event)` (403 unless `has_management_permissions`, organizer+), `requireAdminPermission(event)` (403 unless `is_admin_or_above`, admin+), `requireSuperAdminPermission(event)` (403 unless `is_super_admin`)
  - `idRequest.ts` — `parseIdMutationRequest`/`parseIdRequest`, the shared auth+id+body+client prologue for `/[id]/update.post.ts`/`/[id]/delete.post.ts` endpoints (organizer-level by default; an endpoint needing a stricter or conditional tier inlines its own check instead, e.g. `transactions/create.post.ts` requiring admin specifically for `'Association Fee'` payments); also `softDeleteById`/`restoreById`/`purgeById`/`updateStatusById`, the shared soft-delete/restore/purge/status-update table operations
  - `auditColumns.ts` — `auditColumnsForInsert(event, user)`/`auditColumnsForUpdate(event, user)`, resolves the acting user's `pauperwave_associates.uuid` and returns `{ created_by, updated_by }` (insert) or `{ updated_by, updated_at }` (update) to spread into the write payload
- A gotcha hit while building this: `serverSupabaseUser(event)` resolves the **JWT payload**, not the full Supabase `User` — the user id is the standard JWT `sub` claim (`user.sub`), not `.id` (`undefined`). The user's email is available directly as `user.email` (JWT claim), no extra lookup needed.

## Domains on the BFF pattern (real Supabase, full CRUD)

| Domain | Server routes | Notes |
|---|---|---|
| `wanted-cards` | `server/api/wanted-cards/**` | The original template for this pattern |
| `associates` | `server/api/associates/**` | Also `apply`/`approve`/`reject`/`renew`/`approve-renewal`/`restore` — the membership application/renewal workflow, not just CRUD |
| `events` | `server/api/events/**` | |
| `leagues` | `server/api/leagues/**` | Also `[id]/ruleset.post.ts` |
| `locations` | `server/api/locations/**` | |
| `mtg-formats` | `server/api/mtg-formats/**` | |
| `players` | `server/api/players/**` | No create/update endpoint — a `players` row is provisioned via `register_tournament_players` (RPC, tournament registration), not directly edited |
| `tournament-registrations` | `server/api/tournament-registrations/**` | |
| `tournaments` | `server/api/tournaments/**` | Also `[id]/entry-fee.post.ts`, `[id]/image.post.ts`, `[id]/league.post.ts` |
| `transactions` | `server/api/transactions/**` | `create`/`[id]/update` require admin specifically for `'Association Fee'` payments (see `idRequest.ts` above) |
| `trash` | `server/api/trash/**` | `restore.post.ts` (admin), `purge.post.ts` (super_admin) — not a domain of its own, operates across every soft-deletable table (`docs/architecture/database.md`) |
| `cardtrader` | `server/api/cardtrader/**` | Read-only proxy/cache (`price.get.ts`/`resolve.get.ts`), not a mutation domain |
| `settings` | `server/api/settings/**` | `members.get.ts` (real account-linked players + roles, admin-gated read), `update-membership-fee.post.ts`, `update-trash-retention.post.ts`, `update-tournament-settings.post.ts` (round durations, default round counts and the Swiss rounds-by-players table) |
| `commander-decks` | `server/api/commander-decks/**` | `create`/`update`/`delete`/`select.post.ts` (assign a deck to a player for a tournament), `set-bracket.post.ts` |
| `player-avoid-pairs` | `server/api/player-avoid-pairs/**` | `create`/`delete` — pairing-avoidance constraints for the Swiss/Commander pairing engine |
| `tournament-rounds` | `server/api/tournament-rounds/**` | Round lifecycle for live pairing: `start-round-one[-swiss]`, `advance-round[-swiss]`, `turn-back-round[-swiss]`, `reset`, `reset-pairing`, `undraw-pairing` |
| `tournament-round-results` | `server/api/tournament-round-results/**` | `upsert.post.ts` — records a pod/table's result for a round |
| `tournament-match-results` | `server/api/tournament-match-results/**` | `upsert.post.ts` — records a 1v1 best-of-3 result and marks the pairing completed |
| `tournament-drops` | `server/api/tournament-drops/**` | `set.post.ts` — records or undoes a player's drop (round and time stamped by the database) |
| `tournament-kills` | `server/api/tournament-kills/**` | `create`/`delete` — Commander kill-tracking events |
| `tournament-votes` | `server/api/tournament-votes/**` | `create`/`delete` — Commander brew/play votes |
| `admin` | `server/api/admin/**` | `sync-commanders.post.ts` — incremental resync of `mtg_commanders` from Scryfall, `requireManagementPermission`-gated; ported from `MagicTheGathering/league` |

## Other routes

| Route | Method | Backed by | Notes |
|---|---|---|---|
| `server/api/check-associate.post.ts` | `POST` | Supabase (real) | Checks if an email exists in `pauperwave_associates` before `login.vue` calls `signInWithOtp`. Predates the BFF pattern above — uses `@supabase/supabase-js`'s `createClient` directly with `useRuntimeConfig(event).supabase.secretKey` instead of `serverSupabaseServiceRole`, since it runs unauthenticated, pre-login (no session for `serverSupabase*` helpers to read). |
| `server/api/cittadino.ts` | `GET` | Mock | Static placements — no `tournament_standings`-equivalent table exists yet ([issue #2](https://github.com/Pauperwave/app/issues/2)). |
| `server/api/standings/[format].get.ts` | `GET` | Mock | Same reason as `cittadino.ts` above. |
| `server/api/notifications.ts` | `GET` | Mock | Hardcoded array of fake notifications — no backing table. |
| `server/api/dev/test-login.post.ts` | `POST` | Supabase (real) | Dev-only (404s in production, `import.meta.dev` compiled away) — mints a real session for a designated test associate so browser automation can reach authenticated routes without a magic-link round trip. |
| `server/api/telegram/webhook.post.ts` | `POST` | grammY bot | Telegram's webhook target for the bot — see `docs/architecture/telegram-bot.md`. |
