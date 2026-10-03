// app\composables\tournaments\useRulesetPointsQuery.ts
// Reads a tournament's effective ruleset point values: tournament -> league ->
// leagues.ruleset_uuid, falling back to the is_default ruleset when the tournament has no league or
// the league has no ruleset assigned
import type { RulesetPointValues } from '#shared/utils/tournaments/commanderScoring'
import { mapRulesetPoints } from '#shared/utils/tournaments/rulesetPoints'

export function useRulesetPointsQuery(tournamentUuid: MaybeRefOrGetter<string>) {
  const supabase = useSupabaseClient()
  const { data: tournaments } = useTournamentsQuery()
  const { data: leagues } = useLeaguesQuery()

  const rulesetUuid = computed<string | null>(() => {
    const tournament = (tournaments.value ?? []).find(t => t.uuid === toValue(tournamentUuid))
    if (!tournament?.leagueUuid) return null
    const league = (leagues.value ?? []).find(l => l.uuid === tournament.leagueUuid)
    return league?.rulesetUuid ?? null
  })

  return useQuery({
    key: () => ['ruleset-points', rulesetUuid.value ?? 'default'],
    query: async (): Promise<RulesetPointValues> => {
      let rulesetQuery = supabase.from('rulesets').select('uuid')
      rulesetQuery = rulesetUuid.value
        ? rulesetQuery.eq('uuid', rulesetUuid.value)
        : rulesetQuery.eq('is_default', true)

      const { data: ruleset, error: rulesetError } = await rulesetQuery.limit(1).single()
      if (rulesetError) throw rulesetError

      const { data: points, error: pointsError } = await supabase
        .from('ruleset__points')
        .select('category, points')
        .eq('ruleset_uuid', ruleset.uuid)

      if (pointsError) throw pointsError

      return mapRulesetPoints(points ?? [])
    }
  })
}
