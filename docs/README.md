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
| `architecture/roles.md` | The role hierarchy (`player`/`organizer`/`admin`/`super_admin`) and the three-layer client role-awareness pattern (resolution → route/nav gating → in-page adaptation) as actually implemented, and why none of it is real security on its own | Roles/permissions reference |
| `architecture/permissions.md` | Human-readable 🟢🟡🔴 role × feature matrix — the reference table for "who can do what," companion to `roles.md`'s implementation | Roles/permissions reference |
| `architecture/shortcuts.md` | Full keyboard-shortcut map (`g-x` navigation chords + global toggles), why there are two `defineShortcuts` call sites, and how to add a new one | UI reference |
| `architecture/query-keys.md` | Inventory of every Pinia Colada `useQuery` key (plus the two remaining mock-backed `useAsyncData` ones), naming convention, and which are excluded from `localStorage` persistence for PII | Data-fetching reference |
| `architecture/actions.md` | Per-domain inventory of row context-menu / inline row / bulk-selection actions — what exists, where, and deliberate gaps vs. real ones | UI reference |
| `PROJECT_ANALYSIS.md` | Initial codebase audit (stack, routing, auth flow, data-fetching conventions) — **dated snapshot, several claims superseded by `PROGRESS.md`'s ADRs, see its own header note** | Onboarding (with caveats) |
| `PROGRESS.md` | Backward-looking curated changelog + architecture decisions (ADRs) — the most current architectural source of truth | Architecture history |
| `CHANGELOG.md` | Curated commit trail, grouped by date, with "what/why" for notable commits — not every commit, see the auto-generated root `CHANGELOG.md` for the complete raw index | Architecture history |
| `BACKLOG.md` | Pointer only — committed work items live in [GitHub Issues + the "App" project](https://github.com/orgs/Pauperwave/projects/2) since 2026-08-22, not here | Roadmap (pointer) |
| `TODO.md` | Pointer only — scratch notes/open questions also live in [GitHub Issues + the "App" project](https://github.com/orgs/Pauperwave/projects/2) since 2026-08-22, not here | Roadmap (pointer) |
| `audits/2026-08-05-fallow-dupes-review.md` | `fallow:dupes` findings and why each was deferred or dismissed as premature | Process |
| `audits/2026-08-09-backup-docs-vs-live-schema.md` | The `BACKUP CODICE APP/docs` design docs compared table-by-table against the live schema — what drifted, what was never built, what's undocumented | Data model |
| `audits/2026-08-12-fallow-health-review.md` | `fallow:health` score/hotspots/refactoring-target review — **historical, superseded by the 2026-08-16 audit** | Process (historical) |
| `audits/2026-08-16-fallow-health-review.md` | Follow-up `fallow:health` review: what got fixed since 2026-08-12 (GridView.vue, DetailSlideover.vue, tesseramento/index.vue partially), fresh score/targets, and why the 4 remaining refactoring targets are false economy or deliberately deferred | Process |
| `plans/2026-08-18-testing-coverage-plan.md` | Concrete, tiered list of what to unit/e2e test first, superseding `architecture/testing.md`'s own stale priority list | Test reference |
| `audits/2026-08-18-associates-csv-reconciliation.md` | Categorized review of the 171 field conflicts between the DB and the historical Google Form roster — what's safe to fix, what's already correct, what needs asking the associate directly | Data model |

## Not yet documented

`specs/` exists as a folder for future use (mirroring the taxonomy used in `MagicTheGathering/league`) but has no content yet. Add dated files (`YYYY-MM-DD-topic.md`) as real work in that category happens — see the root `CLAUDE.md` for the date-prefix convention.

## Reading order by task

- **Working on the associates/tesseramento flow?** `architecture/database.md` (membership status model) → root `CLAUDE.md` (auth flow, data-fetching conventions)
- **Building/migrating a data-fetching domain?** `architecture/api.md` (BFF pattern) + `architecture/query-keys.md` (key inventory/naming) — `useWantedCards{Query,Mutations}.ts` is the original Pinia Colada template; `cittadino`/`standings` are the only domains still on `useAsyncData`, pending a real backing table
- **Planning new work?** [GitHub Issues + the "App" project](https://github.com/orgs/Pauperwave/projects/2) before starting — both committed and scratch items live there now
- **Touching the DB schema?** `architecture/database.md` — RLS policies first
- **Building anything role/permission-aware (admin vs. player)?** `architecture/roles.md` first — the role hierarchy and why client-side checks alone aren't security — then `architecture/permissions.md` for the per-feature matrix
