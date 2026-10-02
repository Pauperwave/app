-- supabase\migrations\20261002140000_turn_back_reopens_previous_round.sql
-- Turning back round N (N > 1) deleted it but left round N-1 'completed' (closed by the advance), so the
-- previous round could neither be edited (round data is now writable only while its round is
-- 'in_progress', user request 2026-10-02) nor advanced again (advance_*_round requires an 'in_progress'
-- current round). Both RPCs now reopen round N-1, and a tournament that had already ended is back in progress.
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

    update tournament_rounds
    set status = 'in_progress', ended_at = null
    where tournament_uuid = p_tournament_uuid and round_number = p_current_round_number - 1;

    update tournaments set status = 'in_progress'
    where uuid = p_tournament_uuid and status = 'completed';
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
begin
  select uuid into v_current_round_uuid
  from tournament_rounds
  where tournament_uuid = p_tournament_uuid and round_number = p_current_round_number;

  if v_current_round_uuid is null then
    raise exception 'Round % not found for this tournament', p_current_round_number;
  end if;

  if p_current_round_number > 1 then
    -- Cascades wipe this round's pairings -> tournament_match_results.
    delete from tournament_rounds where uuid = v_current_round_uuid;

    update tournament_rounds
    set status = 'in_progress', ended_at = null
    where tournament_uuid = p_tournament_uuid and round_number = p_current_round_number - 1;

    update tournaments set status = 'in_progress'
    where uuid = p_tournament_uuid and status = 'completed';
    return;
  end if;

  delete from tournament_rounds where tournament_uuid = p_tournament_uuid;

  update tournaments set status = 'registration_open' where uuid = p_tournament_uuid;
end;
$function$;
