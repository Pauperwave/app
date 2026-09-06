-- Drop players.nickname (user request, 2026-08-25) — a display-name override
-- separate from the associate's real name, but the app never treated it as
-- anything but cosmetic (the table/detail page already prefer
-- first_name+last_name as the stable display name, see
-- usePlayersTableColumns.ts/players/[slug]/index.vue). Unlike
-- mtgo_nickname/mtga_nickname (dropped 2026-08-19, 0 of 323 associates had
-- one set), this one does have data (4 of 5 players rows) — the user
-- confirmed dropping it anyway.
--
-- players_full depends on this column — CREATE OR REPLACE VIEW can only add
-- columns at the end, not remove ones in the middle (same reasoning as
-- 20260819110000's own note), so the view is dropped and recreated instead.
drop view public.players_full;

alter table public.players
  drop column nickname;

create view public.players_full as
select
  p.id,
  p.uuid,
  p.user_id,
  p.created_at,
  p.associate_uuid,
  a.first_name,
  a.last_name,
  a.email_address,
  a.pauperwave_associate_number,
  exists (
    select 1
    from public.pauperwave_associate_renewals r
    where r.associate_uuid = p.associate_uuid
      and r.renewal_year = extract(year from current_date)::smallint
  ) as is_active
from public.players p
join public.pauperwave_associates a on a.uuid = p.associate_uuid;

-- Recreating the view drops its grants — restore the same ones it had
-- before (all of anon/authenticated/service_role, matching pg_policies/
-- information_schema.role_table_grants as they stood prior to this migration).
grant all on public.players_full to anon, authenticated, service_role;
