// server\utils\commanderStandings.ts
import type { H3Event } from 'h3'
import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '#shared/utils/types/database'

// Counted-results and top-cutoff are league rules with no column yet, so they stay constants
const COMMANDER_COUNTED_RESULTS = 4
const COMMANDER_TOP_CUTOFF = 8
const COMMANDER_FORMAT_NAME = 'Commander'

// Same payload shape as the mock leagues in server/api/standings/[format].get.ts, plus `points`
// on each result: tournament_standings.player_score is already the event's total (rank, kills,
// votes), so the composable must not rescore it from the rank
export async function fetchCommanderStandings(event: H3Event, requestedLeague: string) {
  const supabase = serverSupabaseServiceRole<Database>(event)

  const { data: format } = await supabase
    .from('mtg_formats')
    .select('uuid')
    .eq('name', COMMANDER_FORMAT_NAME)
    .is('deleted_at', null)
    .maybeSingle()

  const { data: tournaments, error } = await supabase
    .from('tournaments')
    .select('uuid, starts_at, name, league:leagues!inner(uuid, name, status, deleted_at)')
    .eq('format_uuid', format?.uuid ?? '')
    .eq('is_test', false)
    .is('deleted_at', null)
    .is('league.deleted_at', null)
    .not('status', 'in', '(cancelled,draft)')
    .not('starts_at', 'is', null)
    .order('starts_at')

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }

  const leagues = new Map<string, { uuid: string, name: string, status: string }>()
  for (const tournament of tournaments) {
    leagues.set(tournament.league.uuid, tournament.league)
  }

  // Oldest first (tournaments are ordered by date); the active league is the default
  const leagueList = [...leagues.values()]
  const current = leagueList.find(league => league.status === 'active') ?? leagueList.at(-1)
  const selected = leagues.get(requestedLeague) ?? current

  const leagueEvents = tournaments
    .filter(tournament => tournament.league.uuid === selected?.uuid)
    .map(tournament => ({
      uuid: tournament.uuid,
      name: tournament.name,
      date: tournament.starts_at!.slice(0, 10)
    }))

  const [standings, participation] = await Promise.all([
    fetchEventStandings(event, leagueEvents.map(item => item.uuid)),
    fetchParticipationPoints(event)
  ])

  return {
    league: selected?.uuid ?? '',
    leagues: leagueList.map(({ uuid, name }) => ({ uuid, name })),
    countedResults: COMMANDER_COUNTED_RESULTS,
    topCutoff: COMMANDER_TOP_CUTOFF,
    participationPoints: participation,
    events: leagueEvents,
    results: standings
  }
}

async function fetchEventStandings(event: H3Event, tournamentUuids: string[]) {
  if (tournamentUuids.length === 0) return []

  const supabase = serverSupabaseServiceRole<Database>(event)
  const { data, error } = await supabase
    .from('tournament_standings')
    .select('tournament_uuid, player_uuid, player_rank, player_score, player:players_public(first_name, last_name)')
    .in('tournament_uuid', tournamentUuids)
    .not('player_rank', 'is', null)

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }

  return data.map(row => ({
    player_uuid: row.player_uuid,
    player_name: `${row.player?.first_name ?? ''} ${row.player?.last_name ?? ''}`.trim(),
    event_uuid: row.tournament_uuid,
    rank: row.player_rank ?? 0,
    points: row.player_score ?? 0
  }))
}

async function fetchParticipationPoints(event: H3Event) {
  const supabase = serverSupabaseServiceRole<Database>(event)
  const { data } = await supabase
    .from('ruleset__points')
    .select('points, ruleset:rulesets!inner(is_default)')
    .eq('category', 'participation')
    .eq('ruleset.is_default', true)
    .maybeSingle()

  return data?.points ?? 0
}
