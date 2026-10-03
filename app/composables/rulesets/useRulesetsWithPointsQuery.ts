// app\composables\rulesets\useRulesetsWithPointsQuery.ts
// Full ruleset list with every category's point value, for the /rulesets "Gestione" tab: separate
// from the lighter useRulesetsQuery.ts (uuid/name only, for select dropdowns) since it needs the
// ruleset__points join
import { mapRulesetPoints } from '#shared/utils/tournaments/rulesetPoints'

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

      const pointsByRuleset = new Map<string, { category: string, points: number }[]>()
      for (const row of pointsResponse.data ?? []) {
        const existing = pointsByRuleset.get(row.ruleset_uuid) ?? []
        existing.push({ category: row.category, points: row.points })
        pointsByRuleset.set(row.ruleset_uuid, existing)
      }

      return (rulesetsResponse.data ?? []).map((ruleset) => {
        const rows = pointsByRuleset.get(ruleset.uuid) ?? []
        const participation = rows.find(row => row.category === 'participation')?.points ?? 0
        return {
          uuid: ruleset.uuid,
          name: ruleset.name,
          isDefault: ruleset.is_default,
          ...mapRulesetPoints(rows),
          participation
        }
      })
    }
  })
}
