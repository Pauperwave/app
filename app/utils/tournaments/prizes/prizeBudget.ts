// app\utils\tournaments\prizes\prizeBudget.ts
// How many packs each group of players can take, given the prize settings —
// the numbers the allocation, the UI limits and the chart guides are built on.
import type { PrizeDistributionSettings } from '~/types'

export interface PrizeBudget {
  rewardedCount: number
  nonRewardedCount: number
  // totalPacks minus the packs set aside
  distributable: number
  // What is left for the rewarded placements after the non-rewarded minimum
  rewardedPool: number
  // Packs above the guaranteed minimum, shared by the rewarded placements
  bonusPool: number
  // Most bonus packs one placement can take (Infinity = no cap in effect)
  bonusCap: number
}

// Every derived quantity the distribution and the UI limits are built on
export function prizeBudgetOf(
  rankedCount: number,
  settings: PrizeDistributionSettings
): PrizeBudget {
  const minPerPlayer = Math.max(0, settings.minPacksPerPlayer)
  const rewardedCount = Math.max(0, Math.min(settings.topCutoff, rankedCount))
  const nonRewardedCount = Math.max(0, rankedCount - rewardedCount)

  const distributable = Math.max(0, settings.totalPacks - Math.max(0, settings.reservedPacks))
  const nonRewardedTotal = Math.max(0, settings.nonRewardedMinPacks) * nonRewardedCount
  const rewardedPool = Math.max(0, distributable - nonRewardedTotal)
  const bonusPool = Math.max(0, rewardedPool - rewardedCount * minPerPlayer)

  // A cap that could not hold every pack would leave some unassigned, so it is ignored
  const cap = settings.maxPacksPerPlayer
  const capHoldsEverything = cap > 0 && cap * rewardedCount >= rewardedPool
  const bonusCap = capHoldsEverything ? Math.max(0, cap - minPerPlayer) : Infinity

  return { rewardedCount, nonRewardedCount, distributable, rewardedPool, bonusPool, bonusCap }
}
