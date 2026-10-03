-- Test tournaments (tournaments.is_test) must never feed a statistic: their commanders, results,
-- kills and votes are throwaway data. RLS only hides the tournament row itself from non-super-admins,
-- while these views read the child tables as their owner, so they filter on is_test explicitly.

-- Same columns as before (migration 20260919040000), minus the results of test tournaments.
create or replace view public.commander_stats as
select
  cd.commander_1_name,
  cd.commander_2_name,
  count(distinct trr.player_uuid) as player_count,
  count(*) as match_count,
  sum(case when trr.position = 1 then 1 else 0 end) as win_count,
  coalesce(sum(kills.kill_count), 0) as total_kills,
  round(avg(coalesce(kills.kill_count, 0))::numeric, 2) as average_score
from tournament_round_results trr
join tournaments t on t.uuid = trr.tournament_uuid and not t.is_test
join commander_decks cd on cd.uuid = trr.commander_deck_uuid
left join (
  select k.pairing_uuid, k.killer_uuid, count(*) as kill_count
  from tournament_kills k
  join tournaments kt on kt.uuid = k.tournament_uuid and not kt.is_test
  group by k.pairing_uuid, k.killer_uuid
) kills on kills.pairing_uuid = trr.pairing_uuid and kills.killer_uuid = trr.player_uuid
group by cd.commander_1_name, cd.commander_2_name;

-- One row per player with their Commander record, for the "Statistiche" tiles on the player page
-- (league's player_stats shape, plus how often they were named on each side of a kill and a vote).
create or replace view public.player_stats as
select
  p.uuid as player_uuid,
  coalesce(results.tournaments_played, 0) as tournaments_played,
  coalesce(results.matches_played, 0) as matches_played,
  coalesce(results.wins, 0) as wins,
  coalesce(kills_made.total, 0) as kills,
  coalesce(kills_suffered.total, 0) as times_killed,
  coalesce(votes.brew_votes, 0) as brew_votes_received,
  coalesce(votes.play_votes, 0) as play_votes_received,
  case
    when coalesce(results.matches_played, 0) = 0 then 0
    else round(coalesce(kills_made.total, 0)::numeric / results.matches_played, 2)
  end as average_kills
from players p
left join (
  select
    trr.player_uuid,
    count(distinct trr.tournament_uuid) as tournaments_played,
    count(*) as matches_played,
    count(*) filter (where trr.position = 1) as wins
  from tournament_round_results trr
  join tournaments t on t.uuid = trr.tournament_uuid and not t.is_test
  group by trr.player_uuid
) results on results.player_uuid = p.uuid
left join (
  select k.killer_uuid as player_uuid, count(*) as total
  from tournament_kills k
  join tournaments t on t.uuid = k.tournament_uuid and not t.is_test
  group by k.killer_uuid
) kills_made on kills_made.player_uuid = p.uuid
left join (
  select k.killed_player_uuid as player_uuid, count(*) as total
  from tournament_kills k
  join tournaments t on t.uuid = k.tournament_uuid and not t.is_test
  group by k.killed_player_uuid
) kills_suffered on kills_suffered.player_uuid = p.uuid
left join (
  select
    v.voted_player_uuid as player_uuid,
    count(*) filter (where v.vote_type = 'brew') as brew_votes,
    count(*) filter (where v.vote_type = 'play') as play_votes
  from tournament_votes v
  join tournaments t on t.uuid = v.tournament_uuid and not t.is_test
  group by v.voted_player_uuid
) votes on votes.player_uuid = p.uuid;

-- Supabase's default privileges open new views to anon with write grants too: keep it read-only
-- and signed-in only.
revoke all on public.player_stats from anon, authenticated;
grant select on public.player_stats to authenticated;
