-- supabase\migrations\20260814133531_drop_players_is_banned.sql
-- Removes the "Ban" column entirely (user request, 2026-08-14) — not just
-- hidden from the /players table, dropped from the players table itself.
-- players_full (used by usePlayersQuery.ts) selects is_banned explicitly
-- (not select *), so the view has to be dropped and recreated around the
-- column drop; view definition and grants captured live via
-- `supabase db query --linked` before this migration was written, to
-- preserve them exactly.

drop view if exists public.players_full;

alter table public.players drop column is_banned;

create view public.players_full as
select
  p.id,
  p.uuid,
  p.user_id,
  p.nickname,
  p.created_at,
  p.associate_uuid,
  a.first_name,
  a.last_name,
  a.email_address,
  a.pauperwave_associate_number,
  (exists (
    select 1
    from pauperwave_associate_renewals r
    where r.associate_uuid = p.associate_uuid
      and r.renewal_year = extract(year from current_date)::smallint
  )) as is_active
from players p
join pauperwave_associates a on a.uuid = p.associate_uuid;

grant select, insert, update, delete, truncate, references, trigger
  on public.players_full to anon, authenticated, service_role;
