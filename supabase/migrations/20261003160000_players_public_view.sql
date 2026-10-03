-- players_full joins players with their associate, so it carries every player's email and
-- associate number, and it ran as its owner: the associates' RLS (own row, or staff) never applied,
-- so anyone holding the anon key could read all of them. Most of the app only needs a player's name
-- and whether they are active, so that goes into its own view without any personal data; the
-- companion migration 20261003170000 then locks players_full down to what RLS allows.
create or replace view public.players_public as
select
  p.id,
  p.uuid,
  p.user_id,
  p.created_at,
  p.associate_uuid,
  a.first_name,
  a.last_name,
  exists (
    select 1
    from pauperwave_associate_renewals r
    where r.associate_uuid = p.associate_uuid
      and r.renewal_year = extract(year from current_date)::smallint
  ) as is_active
from players p
join pauperwave_associates a on a.uuid = p.associate_uuid;

-- Signed-in users only, read-only (Supabase's default privileges open new views to anon with write
-- grants too).
revoke all on public.players_public from anon, authenticated;
grant select on public.players_public to authenticated;
