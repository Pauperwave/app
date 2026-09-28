// server\utils\tournaments\rulesetPoints.ts
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '#shared/utils/types/database'
import type { RulesetPointValues } from '#shared/utils/tournaments/commanderScoring'
import { mapRulesetPoints } from '#shared/utils/tournaments/rulesetPoints'

// Same resolution as app/composables/tournaments/useRulesetPointsQuery.ts
// (tournament -> league -> leagues.ruleset_uuid, falling back to
// is_default) — the two can't fully share code (one reads already-cached
// Pinia Colada queries, this one is a plain server fetch for the Telegram
// bot's own score summary), but the points-row-to-RulesetPointValues
// mapping itself is shared via mapRulesetPoints (fallow:health flagged it
// as a clone, 2026-09-27).
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

  return mapRulesetPoints(points ?? [])
}
