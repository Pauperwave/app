-- "Annulla Patta" (user request, 2026-09-16: audit against league's it.json
-- surfaced that our "Pareggio" toggle never actually cleared anything —
-- declareDraw just re-applied position 1, so pressing it again on an
-- already-drawn table was a no-op). Ported from league's
-- tournamentStore.undrawPairing: clears only this pairing's ranking + kills,
-- restoring the empty state a draw can only ever be declared from — leaves
-- commander_deck_uuid and votes alone, unlike reset_commander_pairing (which
-- clears everything). tournament_round_results rows are updated, not
-- deleted, since commander_deck_uuid lives on that same row in this schema
-- (league keeps commander/vote state in separate stores, so its own undraw
-- can just delete the ranking rows outright).
create function public.undraw_commander_pairing(
  p_pairing_uuid uuid
)
returns void
language plpgsql
set search_path to 'public'
as $function$
begin
  delete from tournament_kills where pairing_uuid = p_pairing_uuid;
  update tournament_round_results set position = null where pairing_uuid = p_pairing_uuid;
end;
$function$;
