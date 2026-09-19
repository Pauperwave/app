// app\utils\tournaments\prizes\prizeAllocation.ts
// Splits the packs over the ranked players: guaranteed minimums first, then
// the bonus pool by share (with the per-placement cap), largest remainder.
import type { PrizeDistributionSettings } from '~/types'
import { prizeBudgetOf } from '~/utils/tournaments/prizes/prizeBudget'

// Default = the reference example: 34 packs, minimum 3 for the top 8, bonus
// split 40/30/20/10, cap 7 per placement -> 7 6 5 4 3 3 3 3
export const DEFAULT_PRIZE_DISTRIBUTION_SETTINGS: PrizeDistributionSettings = {
  totalPacks: 34,
  minPacksPerPlayer: 3,
  nonRewardedMinPacks: 0,
  reservedPacks: 0,
  maxPacksPerPlayer: 7,
  bonusShares: [40, 30, 20, 10, 0, 0, 0, 0],
  topCutoff: 8
}

// True when every setting is back at its starting value. The shares are
// compared with a tolerance: stepping a pack up and down leaves float noise.
export function isDefaultPrizeSettings(settings: PrizeDistributionSettings): boolean {
  const defaults = DEFAULT_PRIZE_DISTRIBUTION_SETTINGS
  const scalarKeys = (Object.keys(defaults) as Array<keyof PrizeDistributionSettings>)
    .filter(key => key !== 'bonusShares')
  if (scalarKeys.some(key => settings[key] !== defaults[key])) return false

  const length = Math.max(settings.bonusShares.length, defaults.bonusShares.length)
  return Array.from({ length }).every((_, rank) =>
    Math.abs((settings.bonusShares[rank] ?? 0) - (defaults.bonusShares[rank] ?? 0)) < 1e-6)
}

// Guards float noise like 0.9999999 when a share was derived from a pack count
const SHARE_EPSILON = 1e-9

// Splits `pool` bonus packs over the free ranks by their shares (renormalized,
// evenly if all are 0) with the largest-remainder method, so it sums exactly.
function splitByShares(
  freeRanks: number[],
  pool: number,
  shares: number[]
): Map<number, number> {
  const weights = freeRanks.map(rank => Math.max(0, shares[rank] ?? 0))
  const useShares = weights.some(weight => weight > 0)
  const effective = useShares ? weights : weights.map(() => 1)
  const weightSum = effective.reduce((sum, weight) => sum + weight, 0)

  const raw = effective.map(weight => (weight / weightSum) * pool)
  const packs = raw.map(value => Math.floor(value + SHARE_EPSILON))
  let remainder = pool - packs.reduce((sum, value) => sum + value, 0)

  const byRemainderDesc = packs
    .map((_, index) => index)
    .sort((a, b) => ((raw[b] ?? 0) - (packs[b] ?? 0)) - ((raw[a] ?? 0) - (packs[a] ?? 0)))

  for (const index of byRemainderDesc) {
    if (remainder <= 0) break
    packs[index] = (packs[index] ?? 0) + 1
    remainder -= 1
  }

  return new Map(freeRanks.map((rank, index) => [rank, packs[index] ?? 0]))
}

// Only the top `topCutoff` placements are rewarded: each gets
// minPacksPerPlayer first, then the bonus pool is split by bonusShares (rank 0
// = 1st place, renormalized so they need not sum to 100) with the
// largest-remainder method. A placement capped by maxPacksPerPlayer keeps the
// cap and its surplus goes to the others. Non-rewarded players get
// nonRewardedMinPacks and reservedPacks are set aside — so the counts plus the
// reserve always sum to exactly totalPacks.
export function computePrizeDistribution(
  rankedCount: number,
  settings: PrizeDistributionSettings
): number[] {
  if (rankedCount <= 0) return []

  const minPerPlayer = Math.max(0, settings.minPacksPerPlayer)
  const nonRewardedMin = Math.max(0, settings.nonRewardedMinPacks)
  const { rewardedCount, bonusPool, bonusCap } = prizeBudgetOf(rankedCount, settings)

  const result = Array.from({ length: rankedCount },
    (_, rank) => (rank < rewardedCount ? minPerPlayer : nonRewardedMin))
  if (rewardedCount === 0 || bonusPool <= 0) return result

  let freeRanks = Array.from({ length: rewardedCount }, (_, rank) => rank)
  let remaining = bonusPool

  // Water-filling: pin the placements that would exceed the cap, re-split the rest
  while (freeRanks.length > 0) {
    const split = splitByShares(freeRanks, remaining, settings.bonusShares)
    const overCap = freeRanks.filter(rank => (split.get(rank) ?? 0) > bonusCap)

    if (overCap.length === 0) {
      for (const [rank, packs] of split) result[rank] = (result[rank] ?? 0) + packs
      break
    }

    for (const rank of overCap) result[rank] = (result[rank] ?? 0) + bonusCap
    remaining -= overCap.length * bonusCap
    freeRanks = freeRanks.filter(rank => !overCap.includes(rank))
  }

  return result
}
