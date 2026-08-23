-- supabase\migrations\20260823120000_schedule_expired_trash_purge.sql
-- User request (2026-08-23): a countdown on /trash before a soft-deleted
-- row is purged for good, configurable from /settings rather than a fixed
-- number — same "hardcoded constant -> pauperwave_settings column" move as
-- ADR-020's membership fee. pg_cron chosen over an external scheduler (e.g.
-- a GitHub Actions cron, the pattern refresh-wanted-cards-prices.yml
-- already uses) specifically for this job — user preference: the purge is
-- a pure DB operation with no external API to call, so it belongs in
-- Postgres itself rather than pulling in an outside runner just to fire one
-- SQL statement daily.

alter table public.pauperwave_settings
  add column trash_retention_days smallint not null default 60;

alter table public.pauperwave_settings
  add constraint ck_trash_retention_days_positive check (trash_retention_days > 0);

create extension if not exists pg_cron with schema extensions;

-- Same 7-table set as SoftDeletableTable (server/utils/idRequest.ts) /
-- TrashEntity (app/types/index.d.ts) — kept in sync manually, same as
-- those two client/server mirrors already are. SECURITY DEFINER: cron jobs
-- run as the role that scheduled them, but this still needs to bypass RLS
-- the same way the service-role client does for softDeleteById/restoreById.
create function public.purge_expired_trash()
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  cutoff timestamptz;
begin
  select now() - (trash_retention_days || ' days')::interval
    into cutoff
    from public.pauperwave_settings
    where id = 1;

  delete from public.mtg_formats where deleted_at < cutoff;
  delete from public.tournaments where deleted_at < cutoff;
  delete from public.leagues where deleted_at < cutoff;
  delete from public.events where deleted_at < cutoff;
  delete from public.pauperwave_payments where deleted_at < cutoff;
  delete from public.pauperwave_wanted_cards where deleted_at < cutoff;
  delete from public.locations where deleted_at < cutoff;
end;
$function$;

-- Daily at 03:00 UTC — low-traffic hour, same reasoning as the weekly
-- wanted-cards price refresh's own off-peak schedule. Reads
-- trash_retention_days fresh on every run, so an admin changing the
-- setting takes effect the next night without touching this schedule.
select cron.schedule(
  'purge-expired-trash',
  '0 3 * * *',
  $$select public.purge_expired_trash();$$
);
