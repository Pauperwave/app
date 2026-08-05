# Database

<!-- docs/architecture/database.md -->

Supabase Postgres project `app` (`uggrolzdntoamclgnzrt`), 27 tables in the `public` schema. This DB is the intended foundation for the future `MagicTheGathering/league` rebuild — see `docs/PROJECT_ANALYSIS.md` and `CLAUDE.md` for the app's own scope.

## Migrations

Tracked in `supabase/migrations/`, applied via `pnpm exec supabase db push --linked`. Types regenerated into `app/types/database.types.ts` via `pnpm run supabase:types` (excluded from ESLint — see `eslint.config.mjs`).

The project's migration history was adopted retroactively on 2026-08-05: 21 pre-existing schema changes (made directly via the Supabase SQL editor, never tracked in this repo) were marked `reverted` in the CLI's bookkeeping table via `supabase migration repair` — this does **not** touch the actual schema, it only tells the CLI "stop expecting local files for these, start tracking from here."

| Migration | What it does |
|---|---|
| `20260805035231_backfill_and_view_associate_membership_status.sql` | Backfills `pauperwave_associate_renewals` from `association_date`/`payment_date` for approved associates; adds view `pauperwave_associates_with_status` computing `membership_status` (`active`/`to_renew`/`expired`, or the raw `membership_request_status` for non-approved rows) |
| `20260805041528_drop_dead_associate_status_column.sql` | Drops `pauperwave_associates.associate_status` (always `NULL`, superseded by the view above); recreates the view around the narrower table |

## Membership status model

Three layers, kept intentionally separate rather than collapsed into one status column (a prior version had exactly that bug — see `docs/TODO.md`'s RLS item and the `membership_request_status`/`request_status` fix in git history):

1. **Request status** (`pauperwave_associates.membership_request_status`) — one-shot outcome of the membership application: `approved` / `pending` / `rejected`.
2. **Renewal ledger** (`pauperwave_associate_renewals`) — append-only, one row per associate per `renewal_year`. Source of truth for whether someone is currently tesserato.
3. **Computed membership status** (`pauperwave_associates_with_status.membership_status`) — never stored, derived at query time by comparing the latest `renewal_year` to the current calendar year (calendar-year renewal cycle, not per-associate anniversary). Falls back to the request status for `pending`/`rejected` associates.

The view uses `security_invoker = true`, so its join to `pauperwave_associate_renewals` is filtered by the *querying user's* RLS, not a superuser's — see the open verification item in `docs/TODO.md`.

## RLS policies (as of 2026-08-05)

| Table | Policy | Role | Effect |
|---|---|---|---|
| `pauperwave_associates` | `"Only auth users can do things"` | `authenticated` | `FOR ALL`, `USING (true)` — any logged-in user has full read/write on every associate row. Flagged as **P1 in `docs/BACKLOG.md`**: overly permissive, overrides the narrower policies below since Postgres RLS policies are OR'd. |
| `pauperwave_associates` | `management_full_access` | `public` | `has_management_permissions(auth.uid())` |
| `pauperwave_associates` | `player_own_associate` | `public` | `SELECT` only, own record via `players.user_id` |
| `pauperwave_associate_renewals` | `management_full_access` | `public` | `has_management_permissions(auth.uid())` |
| `pauperwave_associate_renewals` | `player_own_renewals` | `public` | `SELECT` only, own record via `players.user_id` — **no blanket `authenticated` policy exists**, unlike the table above |

## Table inventory: format-specific vs. format-agnostic

`app` is meant to support multiple tournament formats (Commander, Premodern, Draft, Pauper, etc. — see `CLAUDE.md`), not just Commander. Several tables bake Commander-specific concepts into their schema (not just their data), which won't generalize as-is once other formats need the same flows.

| Table | Category | Why |
|---|---|---|
| `commander_decks` | 🔴 Commander | name says it |
| `mtg_commanders` | 🔴 Commander | commander card catalog |
| `rulesets` | 🔴 Commander | points-based multiplayer-pod scoring rules |
| `ruleset__points` | 🔴 Commander | same |
| `ruleset__descriptions` | 🔴 Commander | same |
| `tournament_kills` | 🔴 Commander | `killer_uuid`/`killed_player_uuid` — multiplayer-pod "kill" mechanic |
| `tournament_pairings` | 🔴 Commander | `player1_uuid`…`player4_uuid` — hardcodes 4-seat pods, doesn't fit 1v1 matches (Draft/Premodern/Pauper) |
| `tournament_votes` | 🔴 Commander | `vote_type` — "play/brew" vote mechanic specific to Commander pods |
| `tournament_round_results` | 🔴 Commander | has FK `commander_deck_uuid` |
| `tournament_standings` | 🟡 Mixed | generic ranking columns (`player_score`, `player_rank`, `player_victories`) but also `votes_brew_received`/`votes_play_received` — a Commander concept mixed into an otherwise reusable table |
| `tournaments` | 🟢 Agnostic | no Commander-specific columns |
| `tournament_registrations` | 🟢 Agnostic | |
| `tournament_rounds` | 🟢 Agnostic | `round_number`/`status`/timestamps only |
| `mtg_formats` | 🟢 Agnostic | the format registry itself — **but 0 rows**, structurally ready for multi-format, never populated |
| `player_formats` | 🟢 Agnostic | player↔format junction via `format_uuid` |
| `players` | 🟢 Agnostic | |
| `leagues` | 🟢 Agnostic | |
| `events` | 🟢 Agnostic | |
| `event_attendees` | 🟢 Agnostic | |
| `event_locations` | 🟢 Agnostic | |
| `organizations` | 🟢 Agnostic | |
| `pauperwave_associates` | 🟢 Agnostic | membership |
| `pauperwave_associate_renewals` | 🟢 Agnostic | membership |
| `pauperwave_payments` | 🟢 Agnostic | payments |
| `payment_receipts` | 🟢 Agnostic | payments |
| `user_roles` | 🟢 Agnostic | |
| `sync_metadata` | 🟢 Agnostic | infrastructure |

**Takeaway:** before building out Premodern/Draft/Pauper tournament flows, `tournament_pairings` (4-seat assumption), `tournament_votes`/`tournament_kills` (Commander-pod-only mechanics), and the `rulesets` family need a design decision — either made format-aware, or explicitly scoped as Commander-only with a parallel/generic path for other formats.

## Known issues / history

- `pauperwave_associates.request_status` never existed — the real column was always `membership_request_status`, and the values were `approved`/`pending`, not `accepted`/`pending`/`rejected`. Caused the "Stato richiesta" column to render an empty badge for every row. Fixed 2026-08-05 (`fix(associates): 🐛 correct membership_request_status mismatch, wire real status`).
- `associate_status` was always `NULL` for all 242 existing associates — dead column, dropped 2026-08-05 in favor of the computed `membership_status` view.
- See `docs/TODO.md` for open items (RLS/permissions verification for the renewals view, full 27-table audit).
