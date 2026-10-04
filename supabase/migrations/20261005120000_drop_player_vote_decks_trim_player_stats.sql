-- The special mentions now come from tournament_award_winners (20261004220000), which counts the
-- tournaments a player won, so nothing reads the raw totals any more: player_vote_decks (the decks
-- behind every vote received) goes, and player_stats keeps only what the "Statistiche" tiles show
-- (tournaments, matches, wins and the average of kills). The kills still feed that average.
drop view public.player_vote_decks;

drop view public.player_stats;

create view public.player_stats as
select
  p.uuid as player_uuid,
  coalesce(results.tournaments_played, 0) as tournaments_played,
  coalesce(results.matches_played, 0) as matches_played,
  coalesce(results.wins, 0) as wins,
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
) kills_made on kills_made.player_uuid = p.uuid;

-- Read-only and signed-in only, like before.
revoke all on public.player_stats from anon, authenticated;
grant select on public.player_stats to authenticated;
