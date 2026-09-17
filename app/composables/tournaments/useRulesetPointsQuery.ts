// app\composables\tournaments\useRulesetPointsQuery.ts
// Reads a tournament's effective ruleset point values — resolves
// tournament -> league -> leagues.ruleset_uuid (both already exist in the
// schema and were simply never wired together, user request 2026-09-17),
// falling back to whichever ruleset has is_default = true when the
// tournament has no league or the league has no ruleset assigned. Previously
// always read is_default unconditionally (a stub flagged in this file's own
// prior comment and in advance_commander_round's migration).
import type { RulesetPointValues } from './pairing/useCommanderScoring'

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
  })
}
