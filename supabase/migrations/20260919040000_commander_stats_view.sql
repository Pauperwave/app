-- Global aggregate stats per commander (pair), for the /commanders browse
-- page and /commanders/[slug] detail page (user request 2026-09-16: copy
-- league's commander pages, adapted to this app). league's own version is a
-- MATERIALIZED view that needs a manual refresh after data changes
-- (commander_stats, migration 20260528000001) — this app's data volume is
-- far smaller (a single store, not a multi-league database), so a plain
-- view (always live, no refresh job to forget) is the safer choice here.
--
-- Source differs too: league's round_results has commander_1/commander_2
-- as plain text columns directly on the results row; this app links a
-- round result to a reusable commander_decks row instead
-- (tournament_round_results.commander_deck_uuid), so the join below reads
-- the commander names from there. Kills are counted from tournament_kills
-- (keyed by pairing_uuid + killer_uuid), matching league's
-- round_results.number_of_kills the same way useLiveCommanderStandings.ts
-- already does for live standings.
create view public.commander_stats as
select
  cd.commander_1_name,
  cd.commander_2_name,
  count(distinct trr.player_uuid) as player_count,
  count(*) as match_count,
  sum(case when trr.position = 1 then 1 else 0 end) as win_count,
  coalesce(sum(kills.kill_count), 0) as total_kills,
  round(avg(coalesce(kills.kill_count, 0))::numeric, 2) as average_score
from tournament_round_results trr
join commander_decks cd on cd.uuid = trr.commander_deck_uuid
left join (
  select pairing_uuid, killer_uuid, count(*) as kill_count
  from tournament_kills
  group by pairing_uuid, killer_uuid
) kills on kills.pairing_uuid = trr.pairing_uuid and kills.killer_uuid = trr.player_uuid
group by cd.commander_1_name, cd.commander_2_name;
