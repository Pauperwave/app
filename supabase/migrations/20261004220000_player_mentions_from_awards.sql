-- A player's "special mentions" (killer, victim, master brewer, player) count the tournaments where
-- they came first in that award, not every kill or vote they ever received. "First" is the end-of-
-- tournament awards ranking of the site (app/composables/tournaments/prizes/useTournamentAwards.ts,
-- ADR-052): the stat decides, then its tiebreaks; whoever is still level shares the first place and
-- each of them gets the mention. Only completed, non-test tournaments have a final ranking.
--
-- One row per award winner. For master brewer and player it also names the deck that earned it: in
-- that tournament, the deck with the most of those votes (a vote names a player in a pairing and the
-- deck is the one they used there, tournament_round_results.commander_deck_uuid; ties go to the
-- lower commander name). The counts and the deck medals are summed from these rows by the readers
-- (shared/utils/players/playerMentions.ts), so there is nothing else to keep in the database.
--
-- A player's seat in a pairing is player1..4_uuid; kills and votes count only for the seats of the
-- tournament's own pairings, like the live standings (liveCommanderStandings.ts).
create or replace view public.tournament_award_winners as
with seats as (
  select p.uuid as pairing_uuid, p.tournament_uuid, p.round_uuid, s.player_uuid
  from tournament_pairings p
  join tournaments t on t.uuid = p.tournament_uuid and t.status = 'completed' and not t.is_test
  cross join lateral (
    values (p.player1_uuid), (p.player2_uuid), (p.player3_uuid), (p.player4_uuid)
  ) as s(player_uuid)
  where s.player_uuid is not null
), played as (
  select tournament_uuid, player_uuid, count(*) as rounds_played
  from seats
  group by tournament_uuid, player_uuid
), kills_made as (
  select k.tournament_uuid, k.killer_uuid as player_uuid, count(*) as n
  from tournament_kills k
  join seats s on s.pairing_uuid = k.pairing_uuid and s.player_uuid = k.killer_uuid
  group by k.tournament_uuid, k.killer_uuid
), kills_taken as (
  select k.tournament_uuid, k.killed_player_uuid as player_uuid, count(*) as n
  from tournament_kills k
  join seats s on s.pairing_uuid = k.pairing_uuid and s.player_uuid = k.killed_player_uuid
  group by k.tournament_uuid, k.killed_player_uuid
), votes as (
  select
    v.tournament_uuid,
    v.voted_player_uuid as player_uuid,
    v.vote_type,
    count(*) as received,
    count(distinct s.round_uuid) as rounds,
    count(distinct v.voter_uuid) as voters
  from tournament_votes v
  join seats s on s.pairing_uuid = v.pairing_uuid and s.player_uuid = v.voted_player_uuid
  group by v.tournament_uuid, v.voted_player_uuid, v.vote_type
), stats as (
  select
    pl.tournament_uuid,
    pl.player_uuid,
    pl.rounds_played,
    coalesce(km.n, 0) as kills,
    coalesce(kt.n, 0) as deaths,
    coalesce(b.received, 0) as brew,
    coalesce(b.rounds, 0) as brew_rounds,
    coalesce(b.voters, 0) as brew_voters,
    coalesce(pv.received, 0) as play,
    coalesce(pv.rounds, 0) as play_rounds,
    coalesce(pv.voters, 0) as play_voters
  from played pl
  left join kills_made km on km.tournament_uuid = pl.tournament_uuid and km.player_uuid = pl.player_uuid
  left join kills_taken kt on kt.tournament_uuid = pl.tournament_uuid and kt.player_uuid = pl.player_uuid
  left join votes b
    on b.tournament_uuid = pl.tournament_uuid and b.player_uuid = pl.player_uuid and b.vote_type = 'brew'
  left join votes pv
    on pv.tournament_uuid = pl.tournament_uuid and pv.player_uuid = pl.player_uuid and pv.vote_type = 'play'
), ranked as (
  -- Victim: most deaths, then fewer kills, then more deaths per round
  select tournament_uuid, player_uuid, 'victim' as award,
    rank() over (
      partition by tournament_uuid
      order by deaths desc, kills asc, deaths::float8 / rounds_played desc
    ) as position
  from stats where deaths > 0
  union all
  -- Killer: most kills, then fewer deaths, then more kills per round
  select tournament_uuid, player_uuid, 'killer',
    rank() over (
      partition by tournament_uuid
      order by kills desc, deaths asc, kills::float8 / rounds_played desc
    )
  from stats where kills > 0
  union all
  -- Master brewer: most brew votes, then from more rounds, then from more different voters
  select tournament_uuid, player_uuid, 'brewer',
    rank() over (
      partition by tournament_uuid
      order by brew desc, brew_rounds desc, brew_voters desc
    )
  from stats where brew > 0
  union all
  -- Player: same for the play votes
  select tournament_uuid, player_uuid, 'player',
    rank() over (
      partition by tournament_uuid
      order by play desc, play_rounds desc, play_voters desc
    )
  from stats where play > 0
), winners as (
  select tournament_uuid, player_uuid, award from ranked where position = 1
), deck_votes as (
  select
    w.tournament_uuid,
    w.player_uuid,
    w.award,
    cd.uuid as deck_uuid,
    cd.commander_1_name,
    cd.commander_2_name,
    count(*) as votes
  from winners w
  join tournament_votes v
    on v.tournament_uuid = w.tournament_uuid
    and v.voted_player_uuid = w.player_uuid
    and v.vote_type = case w.award when 'brewer' then 'brew' else 'play' end
  join tournament_round_results trr
    on trr.pairing_uuid = v.pairing_uuid and trr.player_uuid = v.voted_player_uuid
  join commander_decks cd on cd.uuid = trr.commander_deck_uuid
  where w.award in ('brewer', 'player')
  group by w.tournament_uuid, w.player_uuid, w.award, cd.uuid, cd.commander_1_name, cd.commander_2_name
), top_deck as (
  select distinct on (tournament_uuid, player_uuid, award)
    tournament_uuid, player_uuid, award, deck_uuid, commander_1_name, commander_2_name
  from deck_votes
  order by tournament_uuid, player_uuid, award, votes desc, commander_1_name, commander_2_name nulls first
)
select
  w.tournament_uuid,
  w.player_uuid,
  w.award,
  td.deck_uuid,
  td.commander_1_name,
  td.commander_2_name
from winners w
left join top_deck td
  on td.tournament_uuid = w.tournament_uuid and td.player_uuid = w.player_uuid and td.award = w.award;

-- Read-only and signed-in only, like player_stats.
revoke all on public.tournament_award_winners from anon, authenticated;
grant select on public.tournament_award_winners to authenticated;
