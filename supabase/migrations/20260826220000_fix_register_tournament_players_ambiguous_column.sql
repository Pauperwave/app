-- supabase\migrations\20260826220000_fix_register_tournament_players_ambiguous_column.sql
-- register_tournament_players (20260825110000) returned a column named
-- associate_uuid — RETURNS TABLE columns become PL/pgSQL variables in scope
-- for the whole function body, and that name collides with players' own
-- associate_uuid column even in supposedly-unambiguous contexts (confirmed
-- live: "insert into players (associate_uuid) ... on conflict
-- (associate_uuid) do nothing" itself throws 42702 "column reference
-- associate_uuid is ambiguous", not just qualified SELECT expressions).
-- Renamed the OUT column to sidestep the collision entirely — callers read
-- it by position (register.post.ts destructures the RPC response), not by
-- name, so this is not a breaking change.
-- create or replace can't change RETURNS TABLE's column set (42P13), even
-- though only a name changed here.
drop function public.register_tournament_players(uuid, uuid[], text);

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
  player_associate_uuid uuid
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
