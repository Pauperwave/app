# Documentation Index

<!-- docs/README.md -->

Master index of all project documentation.

## Already documented

| Doc | What it covers | Priority |
|---|---|---|
| `AGENTS.md` | Core requirements and conventions for agents working in this repo, incl. the BFF write pattern | Required reading for all agents |
| `architecture/database.md` | Supabase schema, migrations, RLS policies, membership-status model, Commander-vs-format-agnostic table inventory, `created_by`/`updated_by` audit columns | Database ops |
| `architecture/api.md` | `server/api/*` inventory: BFF pattern (reads client-side, writes through `server/api/*` with `serverSupabaseServiceRole`), which routes are real vs. mock | API reference |
| `architecture/testing.md` | Current state (runner configured, zero tests written), what a first test pass should prioritize | Test reference |
| `PROJECT_ANALYSIS.md` | Initial codebase audit (stack, routing, auth flow, data-fetching conventions) — **dated snapshot, several claims superseded by `PROGRESS.md`'s ADRs, see its own header note** | Onboarding (with caveats) |
| `PROGRESS.md` | Backward-looking curated changelog + architecture decisions (ADRs) — the most current architectural source of truth | Architecture history |
| `CHANGELOG.md` | Curated commit trail, grouped by date, with "what/why" for notable commits — not every commit, see the auto-generated root `CHANGELOG.md` for the complete raw index | Architecture history |
| `BACKLOG.md` | Forward-looking, committed work items ranked by priority (P1–P3) | Roadmap |
| `TODO.md` | Forward-looking scratch notes: loose observations, open questions, not yet committed | Roadmap (scratch) |
| `audits/2026-08-05-fallow-dupes-review.md` | `fallow:dupes` findings and why each was deferred or dismissed as premature | Process |

## Not yet documented

`plans/` and `specs/` exist as folders for future use (mirroring the taxonomy used in `MagicTheGathering/league`) but have no content yet. Add dated files (`YYYY-MM-DD-topic.md`) as real work in those categories happens — see the root `CLAUDE.md` for the date-prefix convention.

## Reading order by task

- **Working on the associates/tesseramento flow?** `architecture/database.md` (membership status model) → `PROJECT_ANALYSIS.md` (auth/data-fetching conventions, but check `PROGRESS.md` for anything it predates)
- **Building/migrating a data-fetching domain?** `architecture/api.md` (BFF pattern) + `app/composables/useWantedCards{Query,Mutations}.ts` as the concrete template, not `useAssociates.ts`
- **Planning new work?** `BACKLOG.md` (committed) and `TODO.md` (scratch) before starting
- **Touching the DB schema?** `architecture/database.md` — RLS policies and known issues first
- **Wondering "why does this look like it's for a different project's timeline"?** `PROGRESS.md`'s ADR-003 — integration with `MagicTheGathering/league` is imminent (2026-08-30 deadline), not a someday goal
