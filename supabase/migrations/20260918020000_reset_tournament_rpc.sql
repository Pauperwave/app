-- "Reset" button on the tournament detail navbar (user request, 2026-09-18)
-- — wipes every round/pairing/result/standing for a tournament, format-
-- agnostic (works the same for Commander and 1v1 Swiss, since both key off
-- the same tournament_rounds/tournament_pairings tables) and resets the
-- tournament back to registration_open. Same "delete tournament_rounds,
-- cascades do the rest" shape as turn_back_commander_round/
-- turn_back_swiss_round's own round-1 branch, but as its own RPC (rather
-- than requiring the caller to know a "round number" at all) plus a
-- sequence resync step those two don't do.
--
-- Resyncing each identity column's sequence to max(id)+1 across the WHOLE
-- table (not just this tournament) reclaims any gap this reset leaves at
-- the top of the id range — same reasoning as
-- 20260902110424_resync_payments_id_sequence_to_max.sql — without
-- disturbing other tournaments' still-live rows, which keep whatever ids
-- they already have.
create function public.reset_tournament(
  p_tournament_uuid uuid
)
returns void
language plpgsql
set search_path to 'public'
as $function$
begin
  delete from tournament_rounds where tournament_uuid = p_tournament_uuid;
  delete from tournament_standings where tournament_uuid = p_tournament_uuid;

  update tournaments set status = 'registration_open' where uuid = p_tournament_uuid;

  perform setval(
    pg_get_serial_sequence('tournament_rounds', 'id'),
    coalesce((select max(id) from tournament_rounds), 0) + 1,
    false
  );
  perform setval(
    pg_get_serial_sequence('tournament_pairings', 'id'),
    coalesce((select max(id) from tournament_pairings), 0) + 1,
    false
  );
  perform setval(
    pg_get_serial_sequence('tournament_round_results', 'id'),
    coalesce((select max(id) from tournament_round_results), 0) + 1,
    false
  );
  perform setval(
    pg_get_serial_sequence('tournament_kills', 'id'),
    coalesce((select max(id) from tournament_kills), 0) + 1,
    false
  );
  perform setval(
    pg_get_serial_sequence('tournament_votes', 'id'),
    coalesce((select max(id) from tournament_votes), 0) + 1,
    false
  );
  perform setval(
    pg_get_serial_sequence('tournament_standings', 'id'),
    coalesce((select max(id) from tournament_standings), 0) + 1,
    false
  );
  perform setval(
    pg_get_serial_sequence('tournament_match_results', 'id'),
    coalesce((select max(id) from tournament_match_results), 0) + 1,
    false
  );
end;
$function$;
