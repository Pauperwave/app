-- supabase\migrations\20261002110000_tournament_rounds_shuffle_seed.sql
-- Keeps the seed of the confirmed round-1 seating on the round, so after "Torna alle iscrizioni" the table
-- preview can reopen on the approved tables and their seed (user request, 2026-10-02). Null when the seating
-- didn't come from a seeded shuffle (round 2+ is optimized, not shuffled).
alter table public.tournament_rounds
  add column shuffle_seed integer check (shuffle_seed >= 0);

drop function public.start_commander_round_one(uuid, uuid[], int[]);

create function public.start_commander_round_one(
  p_tournament_uuid uuid,
  p_associate_order uuid[],
  p_table_sizes int[] default null,
  p_shuffle_seed int default null
)
returns uuid
language plpgsql
set search_path to 'public'
as $function$
declare
  v_count int := coalesce(array_length(p_associate_order, 1), 0);
  v_table_sizes int[];
  v_player_uuids uuid[];
  v_round_uuid uuid;
  v_cursor int := 1;
  v_table_number int := 1;
  v_size int;
  v_seats uuid[];
begin
  select array_agg(p.uuid order by oa.ord)
  into v_player_uuids
  from unnest(p_associate_order) with ordinality as oa (assoc_uuid, ord)
  join players p on p.associate_uuid = oa.assoc_uuid
  join tournament_registrations tr
    on tr.player_uuid = p.uuid and tr.tournament_uuid = p_tournament_uuid;

  if coalesce(array_length(v_player_uuids, 1), 0) <> v_count then
    raise exception 'Could not resolve every associate to a registered player of this tournament';
  end if;

  v_table_sizes := commander_table_sizes(v_count, p_table_sizes);

  insert into tournament_rounds (tournament_uuid, round_number, status, started_at, shuffle_seed)
  values (p_tournament_uuid, 1, 'in_progress', now(), p_shuffle_seed)
  returning uuid into v_round_uuid;

  foreach v_size in array v_table_sizes loop
    v_seats := v_player_uuids[v_cursor : v_cursor + v_size - 1];
    insert into tournament_pairings (
      round_uuid, tournament_uuid, table_number,
      player1_uuid, player2_uuid, player3_uuid, player4_uuid, status
    ) values (
      v_round_uuid, p_tournament_uuid, v_table_number,
      v_seats[1], v_seats[2], v_seats[3], v_seats[4], 'playing'
    );
    v_cursor := v_cursor + v_size;
    v_table_number := v_table_number + 1;
  end loop;

  insert into tournament_standings (
    tournament_uuid, registration_uuid, player_uuid,
    player_score, player_rank, player_victories,
    votes_brew_received, votes_play_received
  )
  select p_tournament_uuid, tr.uuid, tr.player_uuid, 0, null, 0, 0, 0
  from tournament_registrations tr
  where tr.tournament_uuid = p_tournament_uuid
    and tr.player_uuid = any(v_player_uuids)
  on conflict (registration_uuid) do nothing;

  update tournaments
  set status = 'in_progress'
  where uuid = p_tournament_uuid;

  return v_round_uuid;
end;
$function$;
