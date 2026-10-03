-- The "medals" on a player's page: which of their decks earned the brew (master brewer) and play
-- ("Player") votes they received, and how many each. A vote names a player in a pairing; the deck is
-- the one that player used in that pairing (tournament_round_results.commander_deck_uuid). Test
-- tournaments are left out, like every other statistic (20261003150000).
create or replace view public.player_vote_decks as
select
  v.voted_player_uuid as player_uuid,
  cd.uuid as deck_uuid,
  cd.commander_1_name,
  cd.commander_2_name,
  v.vote_type,
  count(*) as votes
from tournament_votes v
join tournaments t on t.uuid = v.tournament_uuid and not t.is_test
join tournament_round_results trr
  on trr.pairing_uuid = v.pairing_uuid and trr.player_uuid = v.voted_player_uuid
join commander_decks cd on cd.uuid = trr.commander_deck_uuid
group by v.voted_player_uuid, cd.uuid, cd.commander_1_name, cd.commander_2_name, v.vote_type;

-- Read-only and signed-in only, like player_stats.
revoke all on public.player_vote_decks from anon, authenticated;
grant select on public.player_vote_decks to authenticated;
