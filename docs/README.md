# Documentation Index

<!-- docs/README.md -->

Master index of all project documentation.

## Already documented

| Doc | What it covers | Priority |
|---|---|---|
| `AGENTS.md` | Core requirements and conventions for agents working in this repo | Required reading for all agents |
| `architecture/database.md` | Supabase schema, migrations, RLS policies, membership-status model, Commander-vs-format-agnostic table inventory | Database ops |
| `architecture/api.md` | `server/api/*` inventory: which routes are real vs. mock, auth pattern inconsistencies | API reference |
| `architecture/testing.md` | Current state (no automated tests), what a first testing setup should prioritize | Test reference |
| `PROJECT_ANALYSIS.md` | Initial codebase audit (stack, routing, auth flow, data-fetching conventions) | Onboarding |
| `PROGRESS.md` | Backward-looking curated changelog + architecture decisions | Architecture history |
| `CHANGELOG.md` | Raw commit-by-commit trail, newest first | Architecture history |
| `BACKLOG.md` | Forward-looking, committed work items ranked by priority (P1–P3) | Roadmap |
| `TODO.md` | Forward-looking scratch notes: loose observations, open questions, not yet committed | Roadmap (scratch) |
| `audits/2026-08-05-fallow-dupes-review.md` | `fallow:dupes` findings and why each was deferred or dismissed as premature | Process |

## Not yet documented

`plans/` and `specs/` exist as folders for future use (mirroring the taxonomy used in `MagicTheGathering/league`) but have no content yet. Add dated files (`YYYY-MM-DD-topic.md`) as real work in those categories happens — see the root `CLAUDE.md` for the date-prefix convention.

## Reading order by task

- **Working on the associates/tesseramento flow?** `architecture/database.md` (membership status model) → `PROJECT_ANALYSIS.md` (auth/data-fetching conventions)
- **Planning new work?** `BACKLOG.md` (committed) and `TODO.md` (scratch) before starting
- **Touching the DB schema?** `architecture/database.md` — RLS policies and known issues first
