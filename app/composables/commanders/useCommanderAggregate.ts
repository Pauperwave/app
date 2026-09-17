// app\composables\commanders\useCommanderAggregate.ts
// Ported bit-by-bit from MagicTheGathering/league's
// useCommanderAggregate.ts (user request 2026-09-16: copy the commander
// pages, adapted to this app's camelCase CommanderStatsPair shape).
import type { CommanderStatsPair } from './useCommanderStatsQuery'

export interface SingleCommanderAggregate {
  name: string
  playerCount: number
  matchCount: number
  winCount: number
  totalKills: number
  averageScore: number
}

/**
 * Aggregates `commander_stats` (pair-level rows, e.g. "A" alone or "A + B")
 * into a single-commander view: sums across every pair a commander has
 * appeared in, in either the commander1 or commander2 slot. `averageScore`
 * is match-count-weighted, not a plain mean of each pair's own average, so
 * a pair played once doesn't skew the number as much as one played many
 * times.
 *
 * Known approximation, not a bug (same as league): `playerCount` sums each
 * pair's own distinct-player count, so a player who has played this
 * commander with two different partners is counted twice.
 */
export function aggregateSingleCommander(
  pairs: CommanderStatsPair[],
  name: string
): SingleCommanderAggregate | null {
  const matching = pairs.filter(p => p.commander1Name === name || p.commander2Name === name)
  if (matching.length === 0) return null

  const matchCount = matching.reduce((sum, p) => sum + p.matchCount, 0)
  const weightedScoreSum = matching.reduce((sum, p) => sum + p.averageScore * p.matchCount, 0)

  return {
    name,
    playerCount: matching.reduce((sum, p) => sum + p.playerCount, 0),
    matchCount,
    winCount: matching.reduce((sum, p) => sum + p.winCount, 0),
    totalKills: matching.reduce((sum, p) => sum + p.totalKills, 0),
    averageScore: matchCount > 0 ? weightedScoreSum / matchCount : 0
  }
}

/** Every distinct individual commander name appearing in either slot of
 *  `commander_stats`, sorted alphabetically — for a "browse all commanders" list. */
export function getAllCommanderNames(pairs: CommanderStatsPair[]): string[] {
  const names = new Set<string>()
  for (const pair of pairs) {
    names.add(pair.commander1Name)
    if (pair.commander2Name) names.add(pair.commander2Name)
  }
  return [...names].sort((a, b) => a.localeCompare(b))
}

/** Single-commander aggregate stats, computed client-side from the already-cached
 *  `commander_stats` rows (see `useAllCommanderStats`). */
export function useSingleCommanderStats(name: MaybeRefOrGetter<string | null | undefined>) {
  const { data: allStats, isLoading, error } = useAllCommanderStats()

  const data = computed(() => {
    const n = toValue(name)
    if (!n || !allStats.value) return null
    return aggregateSingleCommander(allStats.value, n)
  })

  return { data, isLoading, error }
}
