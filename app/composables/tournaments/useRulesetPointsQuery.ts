// app\composables\tournaments\useRulesetPointsQuery.ts
// Reads the default ruleset's point values (seeded "Base" ruleset, migration
// 20260915000000) — app has no per-tournament/league ruleset assignment yet
// (league resolves one per-league via leagues.ruleset_id), so this always
// reads whichever ruleset has is_default = true. Revisit once a real
// per-tournament ruleset FK exists — same stub noted in
// advance_commander_round's own migration comment.
import type { RulesetPointValues } from './useCommanderScoring'

export const RULESET_POINTS_KEY = ['ruleset-points', 'default']

export function useRulesetPointsQuery() {
  const supabase = useSupabaseClient()

  return useQuery({
    key: () => RULESET_POINTS_KEY,
    query: async (): Promise<RulesetPointValues> => {
      const { data: ruleset, error: rulesetError } = await supabase
        .from('rulesets')
        .select('uuid')
        .eq('is_default', true)
        .limit(1)
        .single()

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
