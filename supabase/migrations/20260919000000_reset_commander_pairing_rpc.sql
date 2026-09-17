-- "Reset tavolo" (user request, 2026-09-19: copy league's per-table reset
-- 1:1, PairingsCard.vue/TableCardActions.vue) — clears one pairing's
-- entered data (ranking, kills, votes) without touching the pairing/seats
-- themselves, so the organizer can start that table's entry over. Doesn't
-- touch commander_decks (a player's own deck record, reusable across
-- rounds) — only tournament_round_results.commander_deck_uuid, the *link*
-- to it for this pairing, which the results-row delete already clears.
create function public.reset_commander_pairing(
  p_pairing_uuid uuid
)
returns void
language plpgsql
set search_path to 'public'
as $function$
begin
  delete from tournament_round_results where pairing_uuid = p_pairing_uuid;
  delete from tournament_kills where pairing_uuid = p_pairing_uuid;
  delete from tournament_votes where pairing_uuid = p_pairing_uuid;
end;
$function$;
