-- supabase\migrations\20261003110000_tournament_fees_capacity_decklists.sql
-- Fields a real event needs, modeled on Radio Atog 2026 (user request, 2026-10-03, plan
-- docs/plans/2026-10-02-event-page.md step 3). All optional: existing tournaments don't change.
-- - entry_fee_non_member: entry_fee stays the members' price; null = the same price for everyone.
-- - max_entrants: players (teams for a team tournament); null = no limit. Self-registration stops at it.
-- - decklist_visibility: 'public' or 'secret'; null = not applicable (Commander).
-- - registration_at: when on-site registration opens, before starts_at (named so it can't be mixed
--   up with a registration's checked_in_at, which is the acceptance).
alter table public.tournaments
  add column entry_fee_non_member numeric,
  add column max_entrants integer,
  add column decklist_visibility text,
  add column registration_at timestamptz;

alter table public.tournaments
  add constraint ck_tournaments_entry_fee_non_member check (entry_fee_non_member >= 0),
  add constraint ck_tournaments_max_entrants check (max_entrants > 0),
  add constraint ck_tournaments_decklist_visibility check (decklist_visibility in ('public', 'secret'));
