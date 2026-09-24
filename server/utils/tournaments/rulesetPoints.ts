// server\utils\tournaments\rulesetPoints.ts
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '#shared/utils/types/database'
import type { RulesetPointValues } from '#shared/utils/tournaments/commanderScoring'

// Same resolution as app/composables/tournaments/useRulesetPointsQuery.ts
// (tournament -> league -> leagues.ruleset_uuid, falling back to
// is_default) — kept in sync manually since one is a Pinia Colada query and
// this is a plain server fetch for the Telegram bot's own score summary.
export async function fetchRulesetPoints(
  supabase: SupabaseClient<Database>, tournamentUuid: string
): Promise<RulesetPointValues> {
  const { data: tournament, error: tournamentError } = await supabase
    .from('tournaments')
    .select('league_uuid')
    .eq('uuid', tournamentUuid)
    .single()
  if (tournamentError) {
    throw createError({ statusCode: 500, statusMessage: tournamentError.message })
  }

  let rulesetUuid: string | null = null
  if (tournament.league_uuid) {
    const { data: league, error: leagueError } = await supabase
      .from('leagues')
      .select('ruleset_uuid')
      .eq('uuid', tournament.league_uuid)
      .single()
    if (leagueError) throw createError({ statusCode: 500, statusMessage: leagueError.message })
    rulesetUuid = league.ruleset_uuid
  }

  let rulesetQuery = supabase.from('rulesets').select('uuid')
  rulesetQuery = rulesetUuid ? rulesetQuery.eq('uuid', rulesetUuid) : rulesetQuery.eq('is_default', true)
  const { data: ruleset, error: rulesetError } = await rulesetQuery.limit(1).single()
  if (rulesetError) throw createError({ statusCode: 500, statusMessage: rulesetError.message })

  const { data: points, error: pointsError } = await supabase
    .from('ruleset__points')
    .select('category, points')
    .eq('ruleset_uuid', ruleset.uuid)
  if (pointsError) throw createError({ statusCode: 500, statusMessage: pointsError.message })

  const byCategory = new Map((points ?? []).map(row => [row.category, row.points]))
  return {
    rank1: byCategory.get('rank1') ?? 0,
    rank2: byCategory.get('rank2') ?? 0,
    rank3: byCategory.get('rank3') ?? 0,
    rank4: byCategory.get('rank4') ?? 0,
    kill: byCategory.get('kill') ?? 0,
    brew: byCategory.get('brew') ?? 0,
    play: byCategory.get('play') ?? 0
  }
}
