-- supabase\migrations\20260823110000_add_deleted_by_to_soft_deletable_tables.sql
-- Dedicated deleted_by, not a reused updated_by (user decision, 2026-08-23):
-- reusing updated_by would conflate "last real edit" with "who
-- deleted/restored," and break once a row is restored via /trash (the
-- column would still say "deleted by X" forever after). Same FK convention
-- as created_by/updated_by elsewhere (pauperwave_associates(uuid), ON
-- DELETE SET NULL — see 20260818100000_finish_audit_trail_pattern.sql and
-- server/utils/auditColumns.ts's own comment on why the target is
-- pauperwave_associates, not auth.users).
--
-- Covers every table in server/utils/idRequest.ts's SoftDeletableTable
-- union (mtg_formats, tournaments, leagues, events, pauperwave_payments,
-- pauperwave_wanted_cards, locations) — softDeleteById/restoreById now
-- stamp/clear this alongside deleted_at for all of them uniformly.
alter table public.mtg_formats add column deleted_by uuid null;
alter table public.tournaments add column deleted_by uuid null;
alter table public.leagues add column deleted_by uuid null;
alter table public.events add column deleted_by uuid null;
alter table public.pauperwave_payments add column deleted_by uuid null;
alter table public.pauperwave_wanted_cards add column deleted_by uuid null;
alter table public.locations add column deleted_by uuid null;

alter table public.mtg_formats
  add constraint fk_mtg_formats_deleted_by
  foreign key (deleted_by) references public.pauperwave_associates (uuid)
  on delete set null;

alter table public.tournaments
  add constraint fk_tournaments_deleted_by
  foreign key (deleted_by) references public.pauperwave_associates (uuid)
  on delete set null;

alter table public.leagues
  add constraint fk_leagues_deleted_by
  foreign key (deleted_by) references public.pauperwave_associates (uuid)
  on delete set null;

alter table public.events
  add constraint fk_events_deleted_by
  foreign key (deleted_by) references public.pauperwave_associates (uuid)
  on delete set null;

alter table public.pauperwave_payments
  add constraint fk_pauperwave_payments_deleted_by
  foreign key (deleted_by) references public.pauperwave_associates (uuid)
  on delete set null;

alter table public.pauperwave_wanted_cards
  add constraint fk_pauperwave_wanted_cards_deleted_by
  foreign key (deleted_by) references public.pauperwave_associates (uuid)
  on delete set null;

alter table public.locations
  add constraint fk_locations_deleted_by
  foreign key (deleted_by) references public.pauperwave_associates (uuid)
  on delete set null;
