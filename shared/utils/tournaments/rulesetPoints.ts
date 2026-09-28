// shared\utils\tournaments\rulesetPoints.ts
import type { RulesetPointValues } from './commanderScoring'

// Maps raw ruleset__points rows (category/points) into the fixed
// RulesetPointValues shape — shared by the client's own Pinia Colada query
// (app/composables/tournaments/useRulesetPointsQuery.ts) and the Telegram
// bot's plain server fetch (server/utils/tournaments/rulesetPoints.ts),
// which fallow:health flagged as near-identical clones (2026-09-27) since
// each independently rebuilt this exact byCategory-lookup block.
export function mapRulesetPoints(
  points: { category: string, points: number }[]
): RulesetPointValues {
  const byCategory = new Map(points.map(row => [row.category, row.points]))
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
