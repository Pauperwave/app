// app\composables\tournaments\prizes\usePrizeDistribution.ts
// Booster-pack redistribution suggestion for the "prizes" stepper step —
// pure calculation, no persistence (user request, 2026-09-17: "solo a
// schermo", the settings live in a local ref and reset on remount).
import type { PrizeDistributionSettings } from '~/types'

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

// Guards float noise like 0.9999999 when a share was derived from a pack count
const SHARE_EPSILON = 1e-9

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

// Lowest/highest pack count a rewarded placement can take: the guaranteed
// minimum, up to the minimum plus the whole bonus pool (or the cap).
export function rewardedPacksRange(
  rankedCount: number,
  settings: PrizeDistributionSettings
): { min: number, max: number } {
  const min = Math.max(0, settings.minPacksPerPlayer)
  const { bonusPool, bonusCap } = prizeBudgetOf(rankedCount, settings)
  return { min, max: min + Math.min(bonusPool, bonusCap) }
}

// Gives `rank` the requested share and takes/gives the difference from the
// other rewarded ranks, proportionally to what they have (evenly if they were
// all at 0), so the shares keep summing to 100 — the same "packs come from
// somewhere else" mechanism the pack counts follow.
function rebalanceShares(
  rank: number,
  share: number,
  cutoff: number,
  currentShares: number[]
): number[] {
  const next = Array.from({ length: Math.max(currentShares.length, cutoff) },
    (_, index) => currentShares[index] ?? 0)
  if (rank >= cutoff) return next

  const clamped = Math.min(100, Math.max(0, share))
  const otherRanks = Array.from({ length: cutoff }, (_, index) => index)
    .filter(index => index !== rank)
  if (otherRanks.length === 0) {
    next[rank] = 100
    return next
  }

  const othersTotal = otherRanks.reduce((sum, index) => sum + (next[index] ?? 0), 0)
  const remaining = 100 - clamped

  for (const index of otherRanks) {
    next[index] = othersTotal > 0
      ? ((next[index] ?? 0) / othersTotal) * remaining
      : remaining / otherRanks.length
  }
  next[rank] = clamped

  return next
}

// Re-derives the shares of the rewarded ranks from the whole packs they really
// get (extra packs / bonus pool), so a share is never finer than a pack.
function snapSharesToPacks(
  rankedCount: number,
  settings: PrizeDistributionSettings
): number[] {
  const { rewardedCount, bonusPool } = prizeBudgetOf(rankedCount, settings)
  const next = [...settings.bonusShares]
  if (bonusPool <= 0) return next

  const minPerPlayer = Math.max(0, settings.minPacksPerPlayer)
  const packs = computePrizeDistribution(rankedCount, settings)
  for (let rank = 0; rank < rewardedCount; rank++) {
    next[rank] = (((packs[rank] ?? 0) - minPerPlayer) / bonusPool) * 100
  }

  return next
}

// Keeps packs and shares linked: when the organizer asks for a pack count on a
// rank, derive that rank's share of the bonus pool, take/give the difference
// from the other rewarded ranks, then snap every share to the whole packs it
// produces. Moving a rank by one pack therefore moves exactly one pack.
export function sharesForPackEdit(
  rank: number,
  packs: number,
  rankedCount: number,
  settings: PrizeDistributionSettings
): number[] {
  const { rewardedCount, bonusPool, bonusCap } = prizeBudgetOf(rankedCount, settings)
  if (bonusPool <= 0) return [...settings.bonusShares]

  const minPerPlayer = Math.max(0, settings.minPacksPerPlayer)
  const bonus = Math.min(bonusPool, bonusCap, Math.max(0, packs - minPerPlayer))
  const rebalanced = rebalanceShares(
    rank,
    (bonus / bonusPool) * 100,
    rewardedCount,
    settings.bonusShares
  )

  return snapSharesToPacks(rankedCount, { ...settings, bonusShares: rebalanced })
}

export function usePrizeDistribution(
  rankedCount: MaybeRefOrGetter<number>,
  settings: MaybeRefOrGetter<PrizeDistributionSettings>
) {
  const distribution = computed(() =>
    computePrizeDistribution(toValue(rankedCount), toValue(settings)))

  const allocatedTotal = computed(() => distribution.value.reduce((sum, packs) => sum + packs, 0))

  return { distribution, allocatedTotal }
}
