-- Round-2+ lifecycle for Commander tournaments — ported from league's
-- server/api/tournaments/[tournamentId]/{advance-round,turn-back-round}.post.ts
-- (user request, 2026-09-15/16: copy the round-advance logic as-is), but as
-- single-transaction RPCs rather than a sequence of Supabase JS calls (league
-- itself isn't fully atomic here — a mid-sequence failure there can leave the
-- tournament row advanced with no next-round pairings). Same style as
-- start_commander_round_one (20260915000001): plpgsql, no security definer,
-- no explicit grants.
--
-- Cascades do the RESTRICT-avoidance work league's endpoint had to do by
-- hand (delete round_results/round_kills before pairings, in that order):
-- tournament_pairings.round_uuid, tournament_round_results.pairing_uuid,
-- tournament_kills.pairing_uuid, and tournament_votes.pairing_uuid are all
-- ON DELETE CASCADE here, so `delete from tournament_rounds where uuid = ...`
-- alone wipes everything under it.
--
-- "Current round" is validated against tournament_rounds directly (round_number
-- + status = 'in_progress'), not a tournaments.round_current column — that
-- column exists but start_commander_round_one never set it either;
-- tournament_rounds stays the single source of truth for round progress in
-- this app, unlike league's flat tournaments.tournament_current_round int.

create function public.advance_commander_round(
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
  v_ruleset_uuid uuid;
  v_rank1 int; v_rank2 int; v_rank3 int; v_rank4 int; v_kill int; v_brew int; v_play int;
  v_pos_values int[];
  v_count int;
  v_small_tables int;
  v_ideal_tables int;
  v_table_sizes int[] := array[]::int[];
  v_player_uuids uuid[];
  v_cursor int := 1;
  v_table_number int := 1;
  v_size int;
  v_seats uuid[];
begin
  select uuid into v_current_round_uuid
  from tournament_rounds
  where tournament_uuid = p_tournament_uuid
    and round_number = p_current_round_number
    and status = 'in_progress';

  if v_current_round_uuid is null then
    raise exception 'Round % is not the tournament''s current in_progress round', p_current_round_number;
  end if;

  -- Resolve the (single, seeded) default ruleset's point values — app has no
  -- per-tournament ruleset assignment yet (league resolves one per-league via
  -- leagues.ruleset_id; app only has the one "Base" ruleset seeded so far,
  -- migration 20260915000000). Revisit once a real per-tournament/league
  -- ruleset FK exists.
  select uuid into v_ruleset_uuid from rulesets where is_default = true limit 1;
  if v_ruleset_uuid is null then
    raise exception 'No default ruleset configured';
  end if;

  select
    coalesce(max(points) filter (where category = 'rank1'), 0),
    coalesce(max(points) filter (where category = 'rank2'), 0),
    coalesce(max(points) filter (where category = 'rank3'), 0),
    coalesce(max(points) filter (where category = 'rank4'), 0),
    coalesce(max(points) filter (where category = 'kill'), 0),
    coalesce(max(points) filter (where category = 'brew'), 0),
    coalesce(max(points) filter (where category = 'play'), 0)
  into v_rank1, v_rank2, v_rank3, v_rank4, v_kill, v_brew, v_play
  from ruleset__points
  where ruleset_uuid = v_ruleset_uuid;

  -- Index 0 is unused padding, same as roundScoring.ts's posValues — keeps
  -- effective_position (1-based) usable as a direct array index below.
  v_pos_values := array[0, v_rank1, v_rank2, v_rank3, v_rank4];

  -- Recompute every player's standings from scratch over every round through
  -- p_current_round_number — never incremented onto the already-persisted
  -- value (see calculateRoundScores/fetchRoundData's own comment for why:
  -- idempotent under a turn-back + re-advance, an increment wouldn't be).
  create temporary table tmp_commander_standings on commit drop as
  with round_pairings as (
    select p.uuid as pairing_uuid
    from tournament_pairings p
    join tournament_rounds r on r.uuid = p.round_uuid
    where p.tournament_uuid = p_tournament_uuid
      and r.round_number <= p_current_round_number
  ),
  results as (
    select rr.pairing_uuid, rr.player_uuid, rr.position
    from tournament_round_results rr
    join round_pairings rp on rp.pairing_uuid = rr.pairing_uuid
    where rr.position is not null
  ),
  kills_per_player as (
    select k.pairing_uuid, k.killer_uuid as player_uuid, count(*) as kills
    from tournament_kills k
    join round_pairings rp on rp.pairing_uuid = k.pairing_uuid
    group by k.pairing_uuid, k.killer_uuid
  ),
  brew_votes as (
    select v.pairing_uuid, v.voted_player_uuid as player_uuid, count(*) as brew_count
    from tournament_votes v
    join round_pairings rp on rp.pairing_uuid = v.pairing_uuid
    where v.vote_type = 'brew'
    group by v.pairing_uuid, v.voted_player_uuid
  ),
  play_votes as (
    select v.pairing_uuid, v.voted_player_uuid as player_uuid, count(*) as play_count
    from tournament_votes v
    join round_pairings rp on rp.pairing_uuid = v.pairing_uuid
    where v.vote_type = 'play'
    group by v.pairing_uuid, v.voted_player_uuid
  ),
  -- "Patta" (draw): every seat at 1st AND zero kills for everyone at that
  -- pod — nobody actually won, unlike a genuine multi-way tie for 1st
  -- (which still credits every tied player a victory below).
  pairing_draw as (
    select r.pairing_uuid,
      bool_and(r.position = 1) as all_first,
      bool_and(coalesce(kp.kills, 0) = 0) as no_kills
    from results r
    left join kills_per_player kp
      on kp.pairing_uuid = r.pairing_uuid and kp.player_uuid = r.player_uuid
    group by r.pairing_uuid
  ),
  position_counts as (
    select pairing_uuid, position, count(*) as same_position_count
    from results
    group by pairing_uuid, position
  ),
  -- Positions are stored dense (1,1,2,3 — never a skip-rank 1,1,3,4); this
  -- re-derives the skip-rank starting slot a tie actually occupies, same as
  -- calculatePlayerTableScore's own effectivePosition.
  effective_positions as (
    select r.pairing_uuid, r.player_uuid, r.position,
      1 + count(*) filter (where r2.position < r.position) as effective_position,
      pc.same_position_count
    from results r
    join results r2 on r2.pairing_uuid = r.pairing_uuid
    left join position_counts pc
      on pc.pairing_uuid = r.pairing_uuid and pc.position = r.position
    group by r.pairing_uuid, r.player_uuid, r.position, pc.same_position_count
  ),
  rank_sum as (
    select ep.pairing_uuid, ep.player_uuid, ep.same_position_count,
      sum(v_pos_values[least(ep.effective_position + gs.i, 4)]) as rank_sum_val
    from effective_positions ep
    cross join lateral generate_series(0, ep.same_position_count - 1) as gs(i)
    group by ep.pairing_uuid, ep.player_uuid, ep.same_position_count
  )
  select ep.player_uuid,
    sum(floor(rs.rank_sum_val::numeric / rs.same_position_count))
      + sum(coalesce(kp.kills, 0)) * v_kill
      + sum(coalesce(bv.brew_count, 0)) * v_brew
      + sum(coalesce(pv.play_count, 0)) * v_play as total_score,
    sum(coalesce(kp.kills, 0)) as total_kills,
    sum(coalesce(bv.brew_count, 0)) as total_brew,
    sum(coalesce(pv.play_count, 0)) as total_play,
    sum(case when ep.position = 1 and not coalesce(pd.is_draw_computed, false) then 1 else 0 end) as victories
  from effective_positions ep
  join rank_sum rs
    on rs.pairing_uuid = ep.pairing_uuid and rs.player_uuid = ep.player_uuid
  left join kills_per_player kp
    on kp.pairing_uuid = ep.pairing_uuid and kp.player_uuid = ep.player_uuid
  left join brew_votes bv
    on bv.pairing_uuid = ep.pairing_uuid and bv.player_uuid = ep.player_uuid
  left join play_votes pv
    on pv.pairing_uuid = ep.pairing_uuid and pv.player_uuid = ep.player_uuid
  left join (
    select pairing_uuid, (all_first and no_kills) as is_draw_computed from pairing_draw
  ) pd on pd.pairing_uuid = ep.pairing_uuid
  group by ep.player_uuid;

  update tournament_standings ts
  set player_score = coalesce(t.total_score, 0),
      player_victories = coalesce(t.victories, 0),
      votes_brew_received = coalesce(t.total_brew, 0),
      votes_play_received = coalesce(t.total_play, 0)
  from tmp_commander_standings t
  where ts.tournament_uuid = p_tournament_uuid
    and ts.player_uuid = t.player_uuid;

  -- Anyone with zero scored results so far (e.g. registered but hasn't
  -- played a completed pod yet) has no row in tmp_commander_standings —
  -- zero them explicitly rather than leaving a stale score from a prior
  -- recompute.
  update tournament_standings ts
  set player_score = 0, player_victories = 0, votes_brew_received = 0, votes_play_received = 0
  where ts.tournament_uuid = p_tournament_uuid
    and not exists (
      select 1 from tmp_commander_standings t where t.player_uuid = ts.player_uuid
    );

  with ranked as (
    select ts.uuid,
      rank() over (
        order by ts.player_score desc, ts.player_victories desc,
          coalesce(t.total_kills, 0) desc, ts.votes_brew_received desc,
          ts.votes_play_received desc, ts.player_uuid asc
      ) as rnk
    from tournament_standings ts
    left join tmp_commander_standings t on t.player_uuid = ts.player_uuid
    where ts.tournament_uuid = p_tournament_uuid
  )
  update tournament_standings ts
  set player_rank = ranked.rnk
  from ranked
  where ts.uuid = ranked.uuid;

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
  if v_count < 3 or v_count = 5 then
    raise exception 'Invalid player count for Commander pods: %', v_count;
  end if;

  -- Same associate -> player_uuid resolution as start_commander_round_one.
  select array_agg(p.uuid order by oa.ord)
  into v_player_uuids
  from unnest(p_associate_order) with ordinality as oa (assoc_uuid, ord)
  join players p on p.associate_uuid = oa.assoc_uuid
  join tournament_registrations tr
    on tr.player_uuid = p.uuid and tr.tournament_uuid = p_tournament_uuid;

  if coalesce(array_length(v_player_uuids, 1), 0) <> v_count then
    raise exception 'Could not resolve every associate to a registered player of this tournament';
  end if;

  v_small_tables := (4 - (v_count % 4)) % 4;
  v_ideal_tables := (v_count - v_small_tables * 3) / 4;

  for i in 1..v_ideal_tables loop
    v_table_sizes := v_table_sizes || 4;
  end loop;
  for i in 1..v_small_tables loop
    v_table_sizes := v_table_sizes || 3;
  end loop;

  insert into tournament_rounds (tournament_uuid, round_number, status, started_at)
  values (p_tournament_uuid, v_new_round_number, 'in_progress', now())
  returning uuid into v_new_round_uuid;

  foreach v_size in array v_table_sizes loop
    v_seats := v_player_uuids[v_cursor : v_cursor + v_size - 1];
    insert into tournament_pairings (
      round_uuid, tournament_uuid, table_number,
      player1_uuid, player2_uuid, player3_uuid, player4_uuid, status
    ) values (
      v_new_round_uuid, p_tournament_uuid, v_table_number,
      v_seats[1], v_seats[2], v_seats[3], v_seats[4], 'playing'
    );
    v_cursor := v_cursor + v_size;
    v_table_number := v_table_number + 1;
  end loop;

  return v_new_round_uuid;
end;
$function$;

create function public.turn_back_commander_round(
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
    -- Cascades wipe this round's pairings -> results/kills/votes. Standings
    -- are NOT touched here on purpose (same as league) — the next
    -- advance_commander_round call recomputes them from scratch over
    -- whatever rounds/results still exist, self-correcting.
    delete from tournament_rounds where uuid = v_current_round_uuid;
    return;
  end if;

  -- Round 1 -> back to registration. Nothing to restore into a separate
  -- waitroom (unlike league) — app's tournament_registrations rows already
  -- persist the registration itself regardless of status.
  delete from tournament_rounds where tournament_uuid = p_tournament_uuid;
  delete from tournament_standings where tournament_uuid = p_tournament_uuid;

  update tournaments set status = 'registration_open' where uuid = p_tournament_uuid;
end;
$function$;
