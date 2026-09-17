// app\composables\rulesets\useRulesetsWithPointsQuery.ts
// Full ruleset list with every category's point value, for the /rulesets
// "Gestione" management tab (user request, 2026-09-17) — separate from the
// lighter useRulesetsQuery.ts (uuid/name only, used by select dropdowns
// elsewhere) since this one needs the full ruleset__points join.
export interface RulesetWithPoints {
  uuid: string
  name: string
  isDefault: boolean
  rank1: number
  rank2: number
  rank3: number
  rank4: number
  kill: number
  brew: number
  play: number
  participation: number
}

export const RULESETS_WITH_POINTS_KEY = ['rulesets-with-points']

export function useRulesetsWithPointsQuery() {
  const supabase = useSupabaseClient()

  return useQuery({
    key: RULESETS_WITH_POINTS_KEY,
    query: async (): Promise<RulesetWithPoints[]> => {
      const [rulesetsResponse, pointsResponse] = await Promise.all([
        supabase.from('rulesets').select('uuid, name, is_default').order('name'),
        supabase.from('ruleset__points').select('ruleset_uuid, category, points')
      ])

      if (rulesetsResponse.error) throw rulesetsResponse.error
      if (pointsResponse.error) throw pointsResponse.error

      const pointsByRuleset = new Map<string, Map<string, number>>()
      for (const row of pointsResponse.data ?? []) {
        const existing = pointsByRuleset.get(row.ruleset_uuid) ?? new Map<string, number>()
        existing.set(row.category, row.points)
        pointsByRuleset.set(row.ruleset_uuid, existing)
      }

      return (rulesetsResponse.data ?? []).map((ruleset) => {
        const byCategory = pointsByRuleset.get(ruleset.uuid) ?? new Map<string, number>()
        return {
          uuid: ruleset.uuid,
          name: ruleset.name,
          isDefault: ruleset.is_default,
          rank1: byCategory.get('rank1') ?? 0,
          rank2: byCategory.get('rank2') ?? 0,
          rank3: byCategory.get('rank3') ?? 0,
          rank4: byCategory.get('rank4') ?? 0,
          kill: byCategory.get('kill') ?? 0,
          brew: byCategory.get('brew') ?? 0,
          play: byCategory.get('play') ?? 0,
          participation: byCategory.get('participation') ?? 0
        }
      })
    }
  })
}
