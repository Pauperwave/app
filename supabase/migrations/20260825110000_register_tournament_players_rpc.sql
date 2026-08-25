-- supabase\migrations\20260825110000_register_tournament_players_rpc.sql
-- Makes "get-or-create players row per associate, then upsert their
-- tournament_registrations row" atomic — previously done as two separate
-- Supabase JS calls from server/api/tournament-registrations/register.post.ts,
-- which meant a failure between the two steps could leave an orphaned
-- `players` row with no registration. One function, one transaction (a
-- single RPC call is already one implicit transaction in Postgres).
create function public.register_tournament_players(
  p_tournament_uuid uuid,
  p_associate_uuids uuid[],
  p_status text default 'registered'
)
returns table (
  registration_uuid uuid,
  status text,
  created_at timestamptz,
  checked_in_at timestamptz,
  associate_uuid uuid
)
language plpgsql
set search_path to 'public'
as $function$
begin
  insert into players (associate_uuid)
  select a
  from unnest(p_associate_uuids) as a
  on conflict (associate_uuid) do nothing;

  insert into tournament_registrations (tournament_uuid, player_uuid, status, checked_in_at)
  select p_tournament_uuid, pl.uuid, p_status,
         case when p_status = 'checked_in' then now() else null end
  from players pl
  where pl.associate_uuid = any(p_associate_uuids)
  on conflict (player_uuid, tournament_uuid) do nothing;

  return query
  select tr.uuid, tr.status, tr.created_at, tr.checked_in_at, pl.associate_uuid
  from tournament_registrations tr
  join players pl on pl.uuid = tr.player_uuid
  where tr.tournament_uuid = p_tournament_uuid
    and pl.associate_uuid = any(p_associate_uuids);
end;
$function$;
