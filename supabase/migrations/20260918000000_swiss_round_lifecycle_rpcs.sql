-- Round lifecycle for 1v1 Swiss-format tournaments (Draft after its pod
-- stage, Pauper/Premodern/Oldschool/Sealed/Cubo Vintage) — Phase 1 of
-- docs/plans/2026-09-15-swiss-pairing-draft-1v1-plan.md. Unlike Commander's
-- start_commander_round_one/advance_commander_round, there is no real
-- pairing-by-standings algorithm yet (no scoring exists for this format
-- yet either) — the caller (SwissTablePreviewModal.vue) hands over an
-- already-ordered, already-paired associate list, exactly like Commander's
-- own round-1 seating; these RPCs only persist it. Real Swiss
-- bracket-by-points pairing is phase 3 of the plan, once
-- tournament_match_results-backed standings exist.
--
-- Odd player counts (byes) are out of scope for phase 1 — same
-- "unplayable count raises, doesn't half-support" precedent as Commander's
-- own "3 or 5 players" exclusion.

-- tournament_pairings was built Commander-only (3-4 players per table) —
-- widen the player-count constraint to also accept the 2-player (1v1) case.
alter table public.tournament_pairings
  drop constraint ck_tournament_pairings_player_count;

alter table public.tournament_pairings
  add constraint ck_tournament_pairings_player_count
  check (
    (player1_uuid is not null and player2_uuid is not null and player3_uuid is null and player4_uuid is null)
    or
    (player1_uuid is not null and player2_uuid is not null and player3_uuid is not null and player4_uuid is null)
    or
    (player1_uuid is not null and player2_uuid is not null and player3_uuid is not null and player4_uuid is not null)
  );

create function public.start_swiss_round_one(
  p_tournament_uuid uuid,
  p_associate_order uuid[]
)
returns uuid
language plpgsql
set search_path to 'public'
as $function$
declare
  v_count int := coalesce(array_length(p_associate_order, 1), 0);
  v_player_uuids uuid[];
  v_round_uuid uuid;
  v_table_number int := 1;
begin
  if v_count < 2 or v_count % 2 <> 0 then
    raise exception 'Invalid player count for 1v1 pairing (byes not supported yet): %', v_count;
  end if;

  select array_agg(p.uuid order by oa.ord)
  into v_player_uuids
  from unnest(p_associate_order) with ordinality as oa (assoc_uuid, ord)
  join players p on p.associate_uuid = oa.assoc_uuid
  join tournament_registrations tr
    on tr.player_uuid = p.uuid and tr.tournament_uuid = p_tournament_uuid;

  if coalesce(array_length(v_player_uuids, 1), 0) <> v_count then
    raise exception 'Could not resolve every associate to a registered player of this tournament';
  end if;

  insert into tournament_rounds (tournament_uuid, round_number, status, started_at)
  values (p_tournament_uuid, 1, 'in_progress', now())
  returning uuid into v_round_uuid;

  for i in 1..v_count by 2 loop
    insert into tournament_pairings (
      round_uuid, tournament_uuid, table_number, player1_uuid, player2_uuid, status
    ) values (
      v_round_uuid, p_tournament_uuid, v_table_number, v_player_uuids[i], v_player_uuids[i + 1], 'playing'
    );
    v_table_number := v_table_number + 1;
  end loop;

  update tournaments
  set status = 'in_progress'
  where uuid = p_tournament_uuid;

  return v_round_uuid;
end;
$function$;

create function public.advance_swiss_round(
  p_tournament_uuid uuid,
  p_current_round_number smallint,
  p_associate_order uuid[] default null
)
returns uuid
language plpgsql
set search_path to 'public'
as $function$
declare
  v_current_round_uuid uuid;
  v_round_count smallint;
  v_new_round_number smallint;
  v_new_round_uuid uuid;
  v_count int;
  v_player_uuids uuid[];
  v_table_number int := 1;
begin
  select uuid into v_current_round_uuid
  from tournament_rounds
  where tournament_uuid = p_tournament_uuid
    and round_number = p_current_round_number
    and status = 'in_progress';

  if v_current_round_uuid is null then
    raise exception 'Round % is not the tournament''s current in_progress round', p_current_round_number;
  end if;

  update tournament_rounds
  set status = 'completed', ended_at = now()
  where uuid = v_current_round_uuid;

  select round_count into v_round_count from tournaments where uuid = p_tournament_uuid;
  v_new_round_number := p_current_round_number + 1;

  if v_new_round_number > coalesce(v_round_count, 0) then
    update tournaments set status = 'completed' where uuid = p_tournament_uuid;
    return null;
  end if;

  v_count := coalesce(array_length(p_associate_order, 1), 0);
  if v_count = 0 then
    raise exception 'associate order is required to create round %', v_new_round_number;
  end if;
  if v_count < 2 or v_count % 2 <> 0 then
    raise exception 'Invalid player count for 1v1 pairing (byes not supported yet): %', v_count;
  end if;

  select array_agg(p.uuid order by oa.ord)
  into v_player_uuids
  from unnest(p_associate_order) with ordinality as oa (assoc_uuid, ord)
  join players p on p.associate_uuid = oa.assoc_uuid
  join tournament_registrations tr
    on tr.player_uuid = p.uuid and tr.tournament_uuid = p_tournament_uuid;

  if coalesce(array_length(v_player_uuids, 1), 0) <> v_count then
    raise exception 'Could not resolve every associate to a registered player of this tournament';
  end if;

  insert into tournament_rounds (tournament_uuid, round_number, status, started_at)
  values (p_tournament_uuid, v_new_round_number, 'in_progress', now())
  returning uuid into v_new_round_uuid;

  for i in 1..v_count by 2 loop
    insert into tournament_pairings (
      round_uuid, tournament_uuid, table_number, player1_uuid, player2_uuid, status
    ) values (
      v_new_round_uuid, p_tournament_uuid, v_table_number, v_player_uuids[i], v_player_uuids[i + 1], 'playing'
    );
    v_table_number := v_table_number + 1;
  end loop;

  return v_new_round_uuid;
end;
$function$;

create function public.turn_back_swiss_round(
  p_tournament_uuid uuid,
  p_current_round_number smallint
)
returns void
language plpgsql
set search_path to 'public'
as $function$
declare
  v_current_round_uuid uuid;
begin
  select uuid into v_current_round_uuid
  from tournament_rounds
  where tournament_uuid = p_tournament_uuid and round_number = p_current_round_number;

  if v_current_round_uuid is null then
    raise exception 'Round % not found for this tournament', p_current_round_number;
  end if;

  if p_current_round_number > 1 then
    -- Cascades wipe this round's pairings -> tournament_match_results (once
    -- phase 2 wires result entry there).
    delete from tournament_rounds where uuid = v_current_round_uuid;
    return;
  end if;

  delete from tournament_rounds where tournament_uuid = p_tournament_uuid;

  update tournaments set status = 'registration_open' where uuid = p_tournament_uuid;
end;
$function$;
