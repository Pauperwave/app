-- supabase\migrations\20261003100000_round_lifecycle_drops_and_reopen.sql
-- Round lifecycle audit (user request, 2026-10-03):
-- 1. Turning back round N used to delete the round and, through tournament_player_drops.round_uuid's
--    ON DELETE CASCADE, every drop recorded in it: a player who really left was silently back in the
--    next pairing. The drops now move to round N-1 (the round that reopens) before N is deleted.
-- 2. "Termina torneo" had no way back once rounds became view only: reopen_tournament puts a completed
--    tournament and its last round back in progress, without deleting anything.
create or replace function public.turn_back_commander_round(
  p_tournament_uuid uuid,
  p_current_round_number smallint
)
returns void
language plpgsql
set search_path to 'public'
as $function$
declare
  v_current_round_uuid uuid;
  v_previous_round_uuid uuid;
begin
  select uuid into v_current_round_uuid
  from tournament_rounds
  where tournament_uuid = p_tournament_uuid and round_number = p_current_round_number;

  if v_current_round_uuid is null then
    raise exception 'Round % not found for this tournament', p_current_round_number;
  end if;

  if p_current_round_number > 1 then
    select uuid into v_previous_round_uuid
    from tournament_rounds
    where tournament_uuid = p_tournament_uuid and round_number = p_current_round_number - 1;

    -- A drop is a real-world event: keep it, filed under the round that reopens.
    update tournament_player_drops
    set round_uuid = v_previous_round_uuid
    where round_uuid = v_current_round_uuid;

    -- Cascades wipe this round's pairings -> results/kills/votes. Standings
    -- are NOT touched here on purpose (same as league) — the next
    -- advance_commander_round call recomputes them from scratch over
    -- whatever rounds/results still exist, self-correcting.
    delete from tournament_rounds where uuid = v_current_round_uuid;

    update tournament_rounds
    set status = 'in_progress', ended_at = null
    where uuid = v_previous_round_uuid;

    update tournaments set status = 'in_progress'
    where uuid = p_tournament_uuid and status = 'completed';
    return;
  end if;

  -- Round 1 -> back to registration (its drops go with it: the tournament starts over).
  delete from tournament_rounds where tournament_uuid = p_tournament_uuid;
  delete from tournament_standings where tournament_uuid = p_tournament_uuid;

  update tournaments set status = 'registration_open' where uuid = p_tournament_uuid;
end;
$function$;

create or replace function public.turn_back_swiss_round(
  p_tournament_uuid uuid,
  p_current_round_number smallint
)
returns void
language plpgsql
set search_path to 'public'
as $function$
declare
  v_current_round_uuid uuid;
  v_previous_round_uuid uuid;
begin
  select uuid into v_current_round_uuid
  from tournament_rounds
  where tournament_uuid = p_tournament_uuid and round_number = p_current_round_number;

  if v_current_round_uuid is null then
    raise exception 'Round % not found for this tournament', p_current_round_number;
  end if;

  if p_current_round_number > 1 then
    select uuid into v_previous_round_uuid
    from tournament_rounds
    where tournament_uuid = p_tournament_uuid and round_number = p_current_round_number - 1;

    update tournament_player_drops
    set round_uuid = v_previous_round_uuid
    where round_uuid = v_current_round_uuid;

    -- Cascades wipe this round's pairings -> tournament_match_results.
    delete from tournament_rounds where uuid = v_current_round_uuid;

    update tournament_rounds
    set status = 'in_progress', ended_at = null
    where uuid = v_previous_round_uuid;

    update tournaments set status = 'in_progress'
    where uuid = p_tournament_uuid and status = 'completed';
    return;
  end if;

  delete from tournament_rounds where tournament_uuid = p_tournament_uuid;

  update tournaments set status = 'registration_open' where uuid = p_tournament_uuid;
end;
$function$;

create function public.reopen_tournament(p_tournament_uuid uuid)
returns void
language plpgsql
set search_path to 'public'
as $function$
declare
  v_last_round_uuid uuid;
begin
  if not exists (
    select 1 from tournaments where uuid = p_tournament_uuid and status = 'completed'
  ) then
    raise exception 'Tournament is not completed';
  end if;

  select uuid into v_last_round_uuid
  from tournament_rounds
  where tournament_uuid = p_tournament_uuid and status = 'completed'
  order by round_number desc
  limit 1;

  if v_last_round_uuid is null then
    raise exception 'Tournament has no completed round to reopen';
  end if;

  update tournament_rounds set status = 'in_progress', ended_at = null where uuid = v_last_round_uuid;
  update tournaments set status = 'in_progress' where uuid = p_tournament_uuid;
end;
$function$;
