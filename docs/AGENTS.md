# Core requirements

<!-- docs/AGENTS.md -->

- The end goal right now is **stability** — this app's Supabase DB is meant to become the foundation for the future `MagicTheGathering/league` rebuild, so schema/data correctness takes priority over new features or refactors.
- See the root `CLAUDE.md` for stack, routing, component organization, auth flow, and data-fetching conventions — this file complements it rather than repeating it.

## Database modifications

- Schema changes go through `supabase/migrations/*.sql`, applied via `pnpm exec supabase db push --linked` — never ad-hoc DDL against the linked project without a migration file.
- Regenerate `app/types/database.types.ts` after any schema change (`pnpm run supabase:types`) so `Associate` and friends in `app/types/index.d.ts` stay honest about nullability and column names.
- See `docs/architecture/database.md` for the full schema reference, RLS policies, and the Commander-vs-format-agnostic table inventory.

## Code quality requirements

- `pnpm lint` and `pnpm typecheck` must be clean after every change (zero-warning policy, see root `CLAUDE.md`).
- Don't add abstractions for a single occurrence — see the root `CLAUDE.md`'s YAGNI/DRY guidance. This app is small; premature generalization (e.g. a shared status-badge config across unrelated domains) costs more than it saves right now.
- Add comments only to explain non-obvious *why*, never *what*.
