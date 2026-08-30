# Database

<!-- docs/architecture/database.md -->

Supabase Postgres project `app` (`uggrolzdntoamclgnzrt`), 31 tables in the `public` schema, per `shared/utils/types/database.ts`.

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
| `players` | 🟢 Agnostic | |
| `leagues` | 🟢 Agnostic | |
| `events` | 🟢 Agnostic | |
| `event_attendees` | 🟢 Agnostic | |
| `locations` | 🟢 Agnostic | renamed from `event_locations`; also grew social/contact columns (`facebook_url`, `google_maps_url`, `instagram_url`, `telegram_url`, `whatsapp_url`, `opening_hours` jsonb, `image_url`, `temporarily_closed`) — corrected 2026-08-17 |
| `organizations` | 🟢 Agnostic | |
| `pauperwave_associates` | 🟢 Agnostic | membership |
| `pauperwave_associate_renewals` | 🟢 Agnostic | membership |
| `pauperwave_payments` | 🟢 Agnostic | payments |
| `payment_receipts` | 🟢 Agnostic | payments |
| `user_roles` | 🟢 Agnostic | |
| `sync_metadata` | 🟢 Agnostic | infrastructure |
| `pauperwave_wanted_cards` | 🟢 Agnostic | "Carte Cercate" feature — deliberately built format-agnostic from the start (2026-08-07), no Pauper/Commander-specific columns |
| `pauperwave_associate_geocodes` | 🟢 Agnostic | cache for the associates map view, unrelated to tournament format |
| `cittadino_editions` | 🟢 Agnostic | added, not previously listed here (2026-08-17) — yearly edition registry (`name`, `year`) |
| `pauperwave_cardtrader_blueprints` | 🟢 Agnostic | added, not previously listed here (2026-08-17) — Cardtrader catalog cache, FK to `pauperwave_cardtrader_expansions` |
| `pauperwave_cardtrader_expansions` | 🟢 Agnostic | added, not previously listed here (2026-08-17) — Cardtrader expansion catalog cache |

**Note:** `player_formats` was previously listed in this table as an existing player↔format junction table — it does not exist in the live schema (confirmed 2026-08-17 against `shared/utils/types/database.ts`); removed from this inventory.

**Takeaway:** before building out Premodern/Draft/Pauper tournament flows, `tournament_pairings` (4-seat assumption), `tournament_votes`/`tournament_kills` (Commander-pod-only mechanics), and the `rulesets` family need a design decision — either made format-aware, or explicitly scoped as Commander-only with a parallel/generic path for other formats.

## `created_by`/`updated_by` audit columns

Present on 6 tables (`pauperwave_associates`, `pauperwave_wanted_cards`, `pauperwave_associate_geocodes`, `pauperwave_associate_renewals`, `pauperwave_payments`, `user_roles`), but until 2026-08-08 **none of them were ever populated** — no trigger, no application code wrote them (confirmed: 0/47 `pauperwave_wanted_cards` rows had either set). Populated now for `pauperwave_wanted_cards` only, via `server/utils/auditColumns.ts` (generic, reusable) called from its BFF endpoints — see ADR-008 in `docs/PROGRESS.md`. The other 5 tables are backlog (`docs/BACKLOG.md`), each needing its own decision on whether `created_by`/`updated_by` should reference `auth.users(id)` (as they do today) or get retargeted to `pauperwave_associates(uuid)` like `wanted_cards` did, depending on whether/how the value is shown in UI.

See `docs/TODO.md` for open items (RLS/permissions verification for the renewals view, full table audit).

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
| `20260808110000_create_cardtrader_cache_tables.sql` | New tables `pauperwave_cardtrader_blueprints`/`pauperwave_cardtrader_expansions` — CardTrader's API has no full-text search, only a per-expansion bulk export, so results actually requested by a wanted-card get cached locally |
| `20260808120000_add_scryfall_id_and_set_code_to_wanted_cards.sql` | Adds `scryfall_id`/`set_code` — `scryfall_url` alone wasn't enough to resolve a direct CardTrader link |
| `20260808130000_wanted_cards_price_sources.sql` | Splits price into two named columns, CardMarket (via Scryfall) and CardTrader (`server/utils/cardTrader.ts`) — was a single unlabeled price field |
| `20260809140000_create_cittadino_editions_and_tournament_fk.sql` | New table `cittadino_editions` (year-scoped, not a league or event) + FK from `tournaments`, backing the "Campionato Cittadino" feature |
| `20260810120000_backfill_associate_type_default.sql` | Backfills `associate_type` for 103/242 associates that had it `NULL` (never valorized for older requests) |
| `20260811090000_associate_type_english_values.sql` | Renames stored `associate_type` values from Italian (`'ordinario'`/`'sostenitore'`) to English (`'regular'`/`'sustaining'`) — Italian belongs in `it.json` as a display translation, not baked into stored data |
| `20260812140000_add_received_by_to_payments.sql` | Restores `received_by` (present in the original pre-repo table design, dropped somewhere along the way, rebuilt as a UI-only mock field in the meantime) |
| `20260812150000_payments_audit_columns.sql` | Adds `created_by`/`updated_by` to `pauperwave_payments` — every other domain table already had them |
| `20260814133531_drop_players_is_banned.sql` | Drops `players.is_banned` entirely (not just hidden from the UI) |
| `20260814134512_drop_player_formats.sql` | Drops the unused `player_formats` join table (`player_uuid`/`format_uuid`, no other columns) |
| `20260815090000_add_wanted_cards_type_line.sql` | Adds `type_line` (Scryfall's own field, e.g. "Land", "Creature — Elf Wizard") to `pauperwave_wanted_cards` |
| `20260815100000_events_tournaments_schema.sql` | Renames `event_locations` to `locations` (generic, not events-specific) and adds the columns the events/tournaments UI needs that the schema never had — `events`/`tournaments`/`leagues` had been running entirely on mock data until this migration |
| `20260815100500_seed_hobbit_draft.sql` | Seeds the first real (non-mock) tournament, the "Lo Hobbit" Draft, plus the location/organization/format rows it references |
| `20260815101000_tournaments_starts_ends_at.sql` | Replaces `tournaments`' single ambiguous `datetime` column with `starts_at`/`ends_at`, matching events/leagues |
| `20260815102000_fix_hobbit_draft_timezone.sql` | Fixes the seed migration's timestamp, cast without a timezone and interpreted as UTC instead of Europe/Rome |
| `20260816120000_add_locations_google_maps_url.sql` | Adds an optional, precise Google Maps place link per location (the existing `googleMapsUrl()` util only builds a generic search link) |
| `20260816130000_add_locations_opening_hours.sql` | Adds `opening_hours` (jsonb, weekly schedule) to `locations` |
| `20260816130500_add_locations_image_url.sql` | Adds an optional cover image per location, shown on the `/locations` grid card |
| `20260816140000_add_locations_social_links.sql` | Adds `facebook_url`/`instagram_url`/`telegram_url` to `locations` |
| `20260816150000_fix_organizations_pauperwave_casing.sql` | Branding fix: `"PauperWave"` → `"Pauperwave"` everywhere, including the seeded `organizations` row |
| `20260816160000_add_locations_whatsapp_and_temporarily_closed.sql` | Adds `whatsapp_url` and a `temporarily_closed` flag to `locations` |
| `20260816170000_seed_mtg_formats.sql` | Seeds the full `mtg_formats` registry (Commander, Pauper, Draft, ...) — previously only had the one row seeded alongside the Hobbit draft |
| `20260816180000_add_mtg_formats_color.sql` | Adds a user-editable `color` column to `mtg_formats` (`mtgFormats/ManageModal.vue`'s `UColorPicker`), previously hardcoded client-side |
| `20260816190000_uppercase_mtg_formats_color.sql` | Normalizes previously-seeded lowercase hex colors to uppercase, matching `UColorPicker`'s own output format |
| `20260816200000_add_mtg_formats_deleted_at.sql` | Adds soft delete (`deleted_at`) to `mtg_formats` — deleting a format used to hard-delete the row |
| `20260816210000_soft_delete_payments_and_wanted_cards.sql` | Extends the same soft-delete convention to `pauperwave_payments` and `pauperwave_wanted_cards`, the two remaining hard-delete endpoints |
| `20260816220000_drop_leagues_season.sql` | Drops `leagues.season` — unused beyond a free-text display column, redundant with a league's own name/dates |
| `20260816230000_add_leagues_image_url.sql` | Adds an optional cover image per league, same convention as `tournaments.image_url` |
| `20260816230500_backfill_leagues_dates.sql` | One-time backfill of derived league dates, following the previous migration |
| `20260817090000_app_role_drop_judge_add_super_admin.sql` | Recreates the `app_role` enum: drops `'judge'` (removed from the app-level role model), adds `'super_admin'` as a new top tier above `'admin'` |
| `20260817100000_create_assign_role_function.sql` | Adds `assign_role(uuid, app_role)`, backing the (at the time still decorative) role dropdown |
| `20260818090000_normalize_constraint_naming.sql` | Renames every constraint still using Postgres's auto-generated name to the project's `pk_`/`uq_`/`fk_`/`ck_` convention — pure rename, no behavior change |
| `20260818090100_normalize_sync_metadata_pkey_naming.sql` | Follow-up to the previous migration — `sync_metadata`'s primary key (on `table_name`, not the usual `id`) was missed the first pass |
| `20260818100000_finish_audit_trail_pattern.sql` | Adds the FK constraints/columns the audit trail pattern always claimed existed but never actually enforced (`pauperwave_associates.created_by`/`updated_by` had no FK; `user_roles` had no columns at all) |
| `20260818110000_backfill_audit_trail_columns.sql` | Backfills pre-existing `NULL` `created_by`/`updated_by` rows, attributed to the app owner's associate uuid |
| `20260818120000_add_latest_renewal_date_to_associates_view.sql` | Adds a computed "latest renewal date" to `pauperwave_associates_with_status` — the previous `payment_date` column was a one-time signup snapshot, never updated on renewal |
| `20260818130000_updated_at_trigger_everywhere.sql` | Actually applies `set_updated_at()` to every table with an `updated_at` column — docs had claimed this was already true, it wasn't (only 3 tables had it) |
| `20260818140000_drop_unused_uuid_ossp_extension.sql` | Drops the `uuid-ossp` extension — installed but never used anywhere in the schema (`gen_random_uuid()`/`pgcrypto` is the only UUID strategy actually in use) |
| `20260818150000_import_missing_associates_from_roster.sql` | One-time import of 81 associates present in the historical roster but never entered into the DB |
| `20260818160000_add_age_to_associates_view.sql` | Adds a computed `age` to `pauperwave_associates_with_status`, same "computed at query time, never stored" convention as `membership_status` |
| `20260818161000_distinguish_unpaid_from_expired_status.sql` | Splits `membership_status`'s `'expired'` case into two: someone whose membership lapsed vs. someone approved but never renewed/paid at all |
| `20260819100000_create_settings_table_for_membership_fee.sql` | New `pauperwave_settings` table backing `/settings`' "Quota associativa" section — the fee amount/payment method were previously hardcoded constants |
| `20260819110000_drop_mtg_nicknames.sql` | Drops `mtgo_nickname`/`mtga_nickname` — verified unused across the entire membership base (0 of 323 associates had either set) |
| `20260820100000_create_player_login_history.sql` | New table backing the player detail page's "Cronologia accessi" section |
| `20260820120000_add_image_card_attribution.sql` | Adds artist/set attribution columns for `tournaments.image_url`/`leagues.image_url`, required alongside any Scryfall `art_crop` use |
| `20260822100000_drop_overly_permissive_associates_policy.sql` | Drops the `"Only auth users can do things"` RLS policy (`FOR ALL`, `USING (true)`) that granted any logged-in user full read/write on every associate row — see the RLS table below |
| `20260823100000_add_locations_deleted_at.sql` | Adds soft delete (`deleted_at`) to `locations` — had create/update/a management page but no delete at all until this |
| `20260823110000_add_deleted_by_to_soft_deletable_tables.sql` | Adds a dedicated `deleted_by` column to every soft-deletable table, instead of reusing `updated_by` (would conflate "last real edit" with "who soft-deleted this") |
| `20260823120000_schedule_expired_trash_purge.sql` | Adds a `pg_cron` job (`purge_expired_trash()`) that auto-purges soft-deleted rows after `pauperwave_settings.trash_retention_days` (60 by default) |
| `20260823130000_admin_can_assign_roles_except_super_admin.sql` | `assign_role` now also allows `admin` (not just `super_admin`) to assign roles, but rejects the call if the target role is `super_admin` or the target's current role already is |
| `20260823140000_role_locked_flag_instead_of_hardcoded_uuid.sql` | Replaces a hardcoded protected-uuid check (added by the previous migration) with a data-driven `role_locked` flag on `user_roles` |
| `20260823150000_add_comped_payment_method.sql` | Adds `'Comped'` (complimentary/free entry) to `ck_payment_method`, needed to import a historical receipts sheet |
| `20260823160000_resequence_payments_id_from_1.sql` | Resequences `pauperwave_payments.id` back to start at 1 — two values had been burned by inserts that never persisted |
| `20260823170000_add_token_purchase_payment_type.sql` | Adds `'Token Purchase'` to `ck_payment_type` (buying tokens to spend inside an event) |
| `20260825100000_drop_dropped_registration_status.sql` | Removes `'dropped'` from `ck_tournament_registrations_status` — a pre-event cancel state the app never modeled |
| `20260825110000_register_tournament_players_rpc.sql` | Adds an RPC making "get-or-create a player row, then upsert their tournament registration" atomic — was two separate non-atomic steps before |
| `20260825120000_drop_players_nickname.sql` | Drops `players.nickname` — a cosmetic display-name override the app never actually used anywhere but display |
| `20260825220000_check_payment_type_event_link.sql` | Adds a check constraint tying `payment_type` to `tournament_uuid`/`event_uuid` |
| `20260825230000_add_payment_receipt_ref.sql` | Adds a real `receipt_ref` column — previously encoded as text inside `notes` and regex-parsed on every read |
| `20260826220000_fix_register_tournament_players_ambiguous_column.sql` | Fixes an ambiguous-column-reference bug in `register_tournament_players` (its own `RETURNS TABLE` column shadowed a PL/pgSQL variable of the same name) |
| `20260827100000_add_associate_membership_events.sql` | New table `pauperwave_associate_membership_events` — an append-only history log, since `pauperwave_associates` is otherwise a single mutable row with no history |
| `20260827120000_add_associate_number_sequence.sql` | Adds a sequence backing `pauperwave_associate_number` — nothing had ever auto-assigned it (confirmed live: 248 approved associates with no number) |