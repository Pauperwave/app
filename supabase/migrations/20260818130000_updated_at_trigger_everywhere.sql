-- docs/supabase/2-database.md has always claimed set_updated_at() is
-- "applied via triggers on all tables with updated_at columns" — false until
-- now. Only pauperwave_wanted_cards, cittadino_editions and pauperwave_payments
-- actually had the trigger (20260808063237, 20260809140000, 20260812150000).
-- pauperwave_associates gets updated_at set a different way, at the app layer
-- (server/utils/auditColumns.ts's auditColumnsForUpdate) — adding the trigger
-- there too is the "safety net for writes outside the BFF" that helper's own
-- comment already says it's meant to be, not a behavior change.
--
-- The other 15 tables never touched updated_at on UPDATE at all — no
-- trigger, no app-layer write in any of their server/api/*/update.post.ts
-- routes — so the column was silently frozen at its insert-time default
-- forever. Wiring the same generic function (unchanged, no redefinition
-- needed) closes that gap everywhere at once.
create trigger set_associates_updated_at
  before update on public.pauperwave_associates
  for each row
  execute function public.set_updated_at();

create trigger set_tournaments_updated_at
  before update on public.tournaments
  for each row
  execute function public.set_updated_at();

create trigger set_leagues_updated_at
  before update on public.leagues
  for each row
  execute function public.set_updated_at();

create trigger set_locations_updated_at
  before update on public.locations
  for each row
  execute function public.set_updated_at();

create trigger set_events_updated_at
  before update on public.events
  for each row
  execute function public.set_updated_at();

create trigger set_players_updated_at
  before update on public.players
  for each row
  execute function public.set_updated_at();

create trigger set_organizations_updated_at
  before update on public.organizations
  for each row
  execute function public.set_updated_at();

create trigger set_mtg_formats_updated_at
  before update on public.mtg_formats
  for each row
  execute function public.set_updated_at();

create trigger set_rulesets_updated_at
  before update on public.rulesets
  for each row
  execute function public.set_updated_at();

create trigger set_commander_decks_updated_at
  before update on public.commander_decks
  for each row
  execute function public.set_updated_at();

create trigger set_event_attendees_updated_at
  before update on public.event_attendees
  for each row
  execute function public.set_updated_at();

create trigger set_payment_receipts_updated_at
  before update on public.payment_receipts
  for each row
  execute function public.set_updated_at();

create trigger set_tournament_pairings_updated_at
  before update on public.tournament_pairings
  for each row
  execute function public.set_updated_at();

create trigger set_tournament_registrations_updated_at
  before update on public.tournament_registrations
  for each row
  execute function public.set_updated_at();

create trigger set_tournament_rounds_updated_at
  before update on public.tournament_rounds
  for each row
  execute function public.set_updated_at();

create trigger set_tournament_standings_updated_at
  before update on public.tournament_standings
  for each row
  execute function public.set_updated_at();
