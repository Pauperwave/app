# Database

<!-- docs/architecture/database.md -->

Supabase Postgres project `app` (`uggrolzdntoamclgnzrt`), 28 tables in the `public` schema (`pauperwave_wanted_cards` added 2026-08-07). Integration with `MagicTheGathering/league` is imminent (deadline 2026-08-30) — `app`'s schema is the destination, `league` gets absorbed here, not the other way around. See ADR-003 (corrected 2026-08-08) in `docs/PROGRESS.md`.

## Migrations

Tracked in `supabase/migrations/`, applied via `pnpm exec supabase db push --linked`. Types regenerated into `shared/utils/types/database.ts` via `pnpm supabase:types` (excluded from ESLint — see `eslint.config.mjs`).

The project's migration history was adopted retroactively on 2026-08-05: 21 pre-existing schema changes (made directly via the Supabase SQL editor, never tracked in this repo) were marked `reverted` in the CLI's bookkeeping table via `supabase migration repair` — this does **not** touch the actual schema, it only tells the CLI "stop expecting local files for these, start tracking from here."

| Migration | What it does |
|---|---|
| `20260805035231_backfill_and_view_associate_membership_status.sql` | Backfills `pauperwave_associate_renewals` from `association_date`/`payment_date` for approved associates; adds view `pauperwave_associates_with_status` computing `membership_status` (`active`/`to_renew`/`expired`, or the raw `membership_request_status` for non-approved rows) |
| `20260805041528_drop_dead_associate_status_column.sql` | Drops `pauperwave_associates.associate_status` (always `NULL`, superseded by the view above); recreates the view around the narrower table |
| `20260807065335_create_associate_geocodes_cache_table.sql` | New table `pauperwave_associate_geocodes`, cache for the associates map view (residence geocoding via Nominatim/Photon) |
| `20260807190720_create_wanted_cards_table.sql` | New table `pauperwave_wanted_cards` (deliberately format-agnostic, no Pauper/Commander-specific columns), FK to `pauperwave_associates`, RLS: read open to all authenticated, writes gated by `has_management_permissions` |
| `20260807192315_rename_wanted_cards_found_at_to_requested_at.sql` | Fixes a naming bug: `found_at` actually meant "date requested", not "date found" — most unfound mock rows had it populated too |
| `20260807200045_open_wanted_cards_insert_to_authenticated.sql` | Opens `INSERT` to any authenticated user (players create their own requests), keeps update/delete management-only |
| `20260807230702_add_wanted_cards_found_at.sql` | Adds a real `found_at timestamptz` + trigger, set automatically when `found` (boolean, at the time) transitions to `true` |
| `20260807231803_wanted_cards_status_tristate.sql` | Replaces the `found` boolean with `status text` (`searching`/`found`/`abandoned`), rewrites the `found_at` trigger around `status` |
| `20260808060300_wanted_cards_requested_at_default.sql` | Adds `default current_date` to `requested_at` (never had one — new requests were inserting with `null`) + backfills existing null rows |
| `20260808063237_wanted_cards_audit_columns.sql` | Retargets `created_by`/`updated_by` FKs from `auth.users(id)` to `pauperwave_associates(uuid)` (avoids needing the Supabase admin API to resolve a display name); adds a generic `set_updated_at()` trigger as a safety net for writes outside the BFF |

## Membership status model

Three layers, kept intentionally separate rather than collapsed into one status column (a prior version had exactly that bug — see `docs/TODO.md`'s RLS item and the `membership_request_status`/`request_status` fix in git history):

1. **Request status** (`pauperwave_associates.membership_request_status`) — one-shot outcome of the membership application: `approved` / `pending` / `rejected`.
2. **Renewal ledger** (`pauperwave_associate_renewals`) — append-only, one row per associate per `renewal_year`. Source of truth for whether someone is currently tesserato.
3. **Computed membership status** (`pauperwave_associates_with_status.membership_status`) — never stored, derived at query time by comparing the latest `renewal_year` to the current calendar year (calendar-year renewal cycle, not per-associate anniversary). Falls back to the request status for `pending`/`rejected` associates.

The view uses `security_invoker = true`, so its join to `pauperwave_associate_renewals` is filtered by the *querying user's* RLS, not a superuser's — see the open verification item in `docs/TODO.md`.

## Associate vs. player vs. app role

Three distinct concepts, easy to conflate because two of them share the word "player" (added 2026-08-10, alongside `docs/architecture/permissions.md`):

- **`pauperwave_associates`** — membership record. Personal/administrative data (tax code, address, membership status, consents). Answers "is this person a paying member of the association" — a legal/business relationship, independent of the app. An associate can exist without ever logging in (e.g. registered by an admin by hand).
- **`players`** — gameplay identity. Nickname, decks, tournament registrations, standings. Answers "who is this person as a competitor." Always linked to exactly one associate (`players.associate_uuid`, `not null`, unique — a real 1:1 FK, confirmed in `shared/utils/types/database.ts`), but only linked to a login *if and when* they authenticate (`players.user_id`, nullable, set on first sign-in — same pattern noted for `pauperwave_associates` in `useCurrentAssociate.ts`'s own comment).
- **`app_role` (`admin | organizer | player`)** — authorization level. Answers "what can this logged-in person do in the app" (see `docs/architecture/permissions.md`). Lives in `user_roles`, keyed by `auth.users.id` — i.e. by *who is logged in*, not by who plays or who is a member.

These three are independent axes, not a hierarchy of one concept:

```
auth.users (login)
  ├── user_roles.user_id  → app_role (admin | organizer | player)   ← AUTHORIZATION
  └── players.user_id     → players row                              ← GAMEPLAY IDENTITY
                                └── players.associate_uuid → pauperwave_associates  ← MEMBERSHIP
```

An `admin` (elevated authorization) is very likely *also* a `players` row (they play in tournaments too) — no contradiction, "what can this person administer" and "how do they compete" are separate questions. Conversely, `app_role = 'player'` (the baseline/lowest authorization tier, the default per `get_user_role`'s `COALESCE`) says nothing by itself about whether that user has a `players` row at all.

**Open question, not verified: does every associate get a `players` row, or only those who actually compete?** No migration in this repo's tracked history creates `players` rows (same pre-existing-schema situation as `user_roles`, adopted retroactively — see "Migrations" above), and no application code in `app/`/`server/` inserts into `players` either — nothing auto-provisions one on associate approval or on first login, as far as this codebase shows. Needs a live-data check (row counts, or associates with no matching `players.associate_uuid`) before assuming either "every associate has one" or "only competitors do."

## RLS policies (as of 2026-08-05, wanted_cards row added 2026-08-08)

| Table | Policy | Role | Effect |
|---|---|---|---|
| `pauperwave_associates` | `"Only auth users can do things"` | `authenticated` | `FOR ALL`, `USING (true)` — any logged-in user has full read/write on every associate row. Flagged as **P1 in `docs/BACKLOG.md`**: overly permissive, overrides the narrower policies below since Postgres RLS policies are OR'd. |
| `pauperwave_associates` | `management_full_access` | `public` | `has_management_permissions(auth.uid())` |
| `pauperwave_associates` | `player_own_associate` | `public` | `SELECT` only, own record via `players.user_id` |
| `pauperwave_associate_renewals` | `management_full_access` | `public` | `has_management_permissions(auth.uid())` |
| `pauperwave_associate_renewals` | `player_own_renewals` | `public` | `SELECT` only, own record via `players.user_id` — **no blanket `authenticated` policy exists**, unlike the table above |
| `pauperwave_wanted_cards` | `Authenticated users can read wanted cards` | `authenticated` | `SELECT`, `USING (true)` |
| `pauperwave_wanted_cards` | `Management can insert/update/delete wanted cards` | `authenticated` | `has_management_permissions(auth.uid())` for update/delete; insert is open to any authenticated user (separate policy) |

**Note:** for `pauperwave_wanted_cards`, these RLS policies are no longer the actual enforcement point for writes — the app talks to this table exclusively through a BFF layer using the service-role key (bypasses RLS entirely), which re-implements the same checks server-side (`server/utils/serverAuth.ts`, see ADR-007/008 in `docs/PROGRESS.md` and `docs/architecture/api.md`). The policies above still gate any *other* client (Supabase dashboard, a future direct client-side write) but are effectively redundant with the BFF for this app's own traffic.

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
| `mtg_formats` | 🟢 Agnostic | the format registry itself — seeded (`Commander`, `Pauper`, `Draft`, ...) and user-editable via `mtgFormats/ManageModal.vue`, including a `color` column (ADR-016) |
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
| `pauperwave_wanted_cards` | 🟢 Agnostic | "Carte Cercate" feature — deliberately built format-agnostic from the start (2026-08-07), no Pauper/Commander-specific columns |
| `pauperwave_associate_geocodes` | 🟢 Agnostic | cache for the associates map view, unrelated to tournament format |

**Takeaway:** before building out Premodern/Draft/Pauper tournament flows, `tournament_pairings` (4-seat assumption), `tournament_votes`/`tournament_kills` (Commander-pod-only mechanics), and the `rulesets` family need a design decision — either made format-aware, or explicitly scoped as Commander-only with a parallel/generic path for other formats.

## `created_by`/`updated_by` audit columns

Present on 6 tables (`pauperwave_associates`, `pauperwave_wanted_cards`, `pauperwave_associate_geocodes`, `pauperwave_associate_renewals`, `pauperwave_payments`, `user_roles`), but until 2026-08-08 **none of them were ever populated** — no trigger, no application code wrote them (confirmed: 0/47 `pauperwave_wanted_cards` rows had either set). Populated now for `pauperwave_wanted_cards` only, via `server/utils/auditColumns.ts` (generic, reusable) called from its BFF endpoints — see ADR-008 in `docs/PROGRESS.md`. The other 5 tables are backlog (`docs/BACKLOG.md`), each needing its own decision on whether `created_by`/`updated_by` should reference `auth.users(id)` (as they do today) or get retargeted to `pauperwave_associates(uuid)` like `wanted_cards` did, depending on whether/how the value is shown in UI.

## Known issues / history

- `pauperwave_associates.request_status` never existed — the real column was always `membership_request_status`, and the values were `approved`/`pending`, not `accepted`/`pending`/`rejected`. Caused the "Stato richiesta" column to render an empty badge for every row. Fixed 2026-08-05 (`fix(associates): 🐛 correct membership_request_status mismatch, wire real status`).
- `associate_status` was always `NULL` for all 242 existing associates — dead column, dropped 2026-08-05 in favor of the computed `membership_status` view.
- `pauperwave_wanted_cards.requested_at` never had a `default` (inherited from being renamed off `found_at`, which also had none) — new requests inserted via `AddModal.vue` got `requested_at = null`, silently breaking the age indicator in the grid/table. Fixed 2026-08-08 with `default current_date` + backfill.
- See `docs/TODO.md` for open items (RLS/permissions verification for the renewals view, full 28-table audit).
