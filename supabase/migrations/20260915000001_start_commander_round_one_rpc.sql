-- Makes "create round 1, split accepted players into pods, seed zeroed
-- standings, flip the tournament to in_progress" atomic — same reasoning
-- as 20260825025133_register_tournament_players_rpc.sql (one RPC call is
-- one Postgres transaction; four separate Supabase JS calls could leave a
-- round with no pairings, or pairings with no standings, on a mid-way
-- failure).
--
-- Pod sizing mirrors app/app/composables/tournaments/useCommanderPods.ts's
-- calculatePods exactly (ideal 4, min 3, 3 and 5 players unplayable) —
-- ported from league's own useTableCalculator.ts, per user request
-- (2026-09-15: copy the round-1/pod logic as-is, no redesign). Seating
-- order is whatever the caller passes in p_associate_order — round 1 has
-- no pairing optimizer in league either, it's a pure client-side random
-- shuffle before confirming (ADR-049), sliced sequentially into pods here
-- exactly like buildPodsFromSizes.ts already does client-side for Draft.
create function public.start_commander_round_one(
  p_tournament_uuid uuid,
  p_associate_order uuid[]
)
returns uuid
language plpgsql
set search_path to 'public'
as $function$
declare
  v_count int := coalesce(array_length(p_associate_order, 1), 0);
  v_small_tables int;
  v_ideal_tables int;
  v_table_sizes int[] := array[]::int[];
  v_player_uuids uuid[];
  v_round_uuid uuid;
  v_cursor int := 1;
  v_table_number int := 1;
  v_size int;
  v_seats uuid[];
begin
  if v_count < 3 or v_count = 5 then
    raise exception 'Invalid player count for Commander pods: %', v_count;
  end if;

  -- Resolve each associate to its player_uuid + confirm it's actually a
  -- registered player of this tournament, preserving the caller's order.
  select array_agg(p.uuid order by oa.ord)
  into v_player_uuids
  from unnest(p_associate_order) with ordinality as oa (assoc_uuid, ord)
  join players p on p.associate_uuid = oa.assoc_uuid
  join tournament_registrations tr
    on tr.player_uuid = p.uuid and tr.tournament_uuid = p_tournament_uuid;

  if coalesce(array_length(v_player_uuids, 1), 0) <> v_count then
    raise exception 'Could not resolve every associate to a registered player of this tournament';
  end if;

  -- Same modular split as useCommanderPods.calculatePods: borrow just
  -- enough 3-seat tables to absorb playerCount's remainder past ideal
  -- 4-seat tables.
  v_small_tables := (4 - (v_count % 4)) % 4;
  v_ideal_tables := (v_count - v_small_tables * 3) / 4;

  for i in 1..v_ideal_tables loop
    v_table_sizes := v_table_sizes || 4;
  end loop;
  for i in 1..v_small_tables loop
    v_table_sizes := v_table_sizes || 3;
  end loop;

  insert into tournament_rounds (tournament_uuid, round_number, status, started_at)
  values (p_tournament_uuid, 1, 'in_progress', now())
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
