-- supabase\migrations\20260825100000_drop_dropped_registration_status.sql
-- Removes 'dropped' from ck_tournament_registrations_status — it's a
-- pre-event concept (a player who cancels their registration before the
-- tournament day), out of scope for AcceptancePicker.vue's day-of
-- check-in flow, which only ever needs to move a row between
-- 'registered' (pending), 'checked_in' (accepted), and 'no_show'. A
-- dropped registration should be deleted upstream (a future "manage
-- pre-registrations" admin view), not represented as a status here.
-- Table has 0 rows at the time of this migration — no data to migrate.
alter table public.tournament_registrations
  drop constraint ck_tournament_registrations_status;

alter table public.tournament_registrations
  add constraint ck_tournament_registrations_status check (
    status = any (array['registered'::text, 'checked_in'::text, 'no_show'::text])
  );
