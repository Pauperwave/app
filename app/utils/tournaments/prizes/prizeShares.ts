// app\utils\tournaments\prizes\prizeShares.ts
// Keeps the per-placement shares and the pack counts linked: editing one
// rebalances the others so every pack stays assigned.
import type { PrizeDistributionSettings } from '~/types'
import { computePrizeDistribution } from '~/utils/tournaments/prizes/prizeAllocation'
import { prizeBudgetOf } from '~/utils/tournaments/prizes/prizeBudget'

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
