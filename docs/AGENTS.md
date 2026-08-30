# Core requirements

<!-- docs/AGENTS.md -->

- See the root `CLAUDE.md` for stack, routing, component organization, auth flow, and data-fetching conventions — this file complements it rather than repeating it.
- New work should be built against the target architecture (Pinia Colada + BFF, see ADR-007/008 in `docs/PROGRESS.md`) rather than throwaway solutions to be redone later.

## Database modifications

- Schema changes go through `supabase/migrations/*.sql`, applied via `pnpm exec supabase db push --linked` — never ad-hoc DDL against the linked project without a migration file.
- Regenerate `shared/utils/types/database.ts` after any schema change (`pnpm supabase:types`) so `Associate` and friends in `app/types/index.d.ts` stay honest about nullability and column names.
- See `docs/architecture/database.md` for the full schema reference, RLS policies, and the Commander-vs-format-agnostic table inventory.

## Writes go through a BFF, not the client

- New/migrated domains (see `wanted-cards` as the template, ADR-007/008 in `docs/PROGRESS.md`): reads go client-side via `useQuery` (Pinia Colada) straight to Supabase with the anon key; writes go through a `server/api/<domain>/*.post.ts` endpoint using `serverSupabaseServiceRole`, which bypasses RLS — that endpoint is the authorization boundary (`server/utils/serverAuth.ts`'s `requireUser`/`requireManagementPermission`), not a DB policy or trigger relying on `auth.uid()` (always `null` under the service-role key).
- `created_by`/`updated_by` population (where those columns exist) goes through `server/utils/auditColumns.ts` (`auditColumnsForInsert`/`auditColumnsForUpdate`), generic and reusable — spread into the insert/update payload of any BFF endpoint, not reinvented per table.

## Code quality requirements

- `pnpm lint` and `pnpm typecheck` must be clean after every change (zero-warning policy, see root `CLAUDE.md`).
- Don't add abstractions for a single occurrence — see the root `CLAUDE.md`'s YAGNI/DRY guidance. This app is small; premature generalization (e.g. a shared status-badge config across unrelated domains) costs more than it saves right now.
- Add comments only to explain non-obvious *why*, never *what*.
