// app\composables\tournaments\prizes\usePrizeDistribution.ts
// Booster-pack redistribution suggestion for the "prizes" stepper step —
// pure calculation, no persistence (user request, 2026-09-17: "solo a
// schermo", the settings live in a local ref and reset on remount).
import type { PrizeDistributionSettings } from '~/types'

export const DEFAULT_PRIZE_DISTRIBUTION_SETTINGS: PrizeDistributionSettings = {
  totalPacks: 0,
  minPacksPerPlayer: 1,
  decay: 0.75,
  topCutoff: 8
}

// Every player gets minPacksPerPlayer first, then the remaining packs
// (totalPacks - guaranteedTotal) are split among the top `topCutoff`
// placements, weighted by decay^rank (rank 0 = 1st place) and rounded to
// whole packs via the largest-remainder method — so the suggested counts
// always sum to exactly totalPacks instead of drifting from float rounding.
export function computePrizeDistribution(
  rankedCount: number,
  settings: PrizeDistributionSettings
): number[] {
  if (rankedCount <= 0) return []

  const minPerPlayer = Math.max(0, settings.minPacksPerPlayer)
  const guaranteed = Array<number>(rankedCount).fill(minPerPlayer)
  const guaranteedTotal = guaranteed.reduce((sum, packs) => sum + packs, 0)
  const bonusPool = Math.max(0, settings.totalPacks - guaranteedTotal)

  const cutoff = Math.max(0, Math.min(settings.topCutoff, rankedCount))
  const rawWeights = Array.from({ length: rankedCount },
    (_, rank) => (rank < cutoff ? settings.decay ** rank : 0))
  const weightSum = rawWeights.reduce((sum, weight) => sum + weight, 0)

  if (bonusPool <= 0 || weightSum <= 0) return guaranteed

  const rawShares = rawWeights.map(weight => (weight / weightSum) * bonusPool)
  const bonusShares = rawShares.map(Math.floor)
  let remainder = bonusPool - bonusShares.reduce((sum, share) => sum + share, 0)

  const remainderOf = (rank: number) => (rawShares[rank] ?? 0) - (bonusShares[rank] ?? 0)
  const byRemainderDesc = bonusShares
    .map((_, rank) => rank)
    .sort((a, b) => remainderOf(b) - remainderOf(a))

  for (const rank of byRemainderDesc) {
    if (remainder <= 0) break
    bonusShares[rank] = (bonusShares[rank] ?? 0) + 1
    remainder -= 1
  }

  return guaranteed.map((packs, rank) => packs + (bonusShares[rank] ?? 0))
}

export function usePrizeDistribution(
  rankedCount: MaybeRefOrGetter<number>,
  settings: MaybeRefOrGetter<PrizeDistributionSettings>
) {
  const distribution = computed(() =>
    computePrizeDistribution(toValue(rankedCount), toValue(settings)))

  const guaranteedTotal = computed(() =>
    toValue(rankedCount) * Math.max(0, toValue(settings).minPacksPerPlayer))
  const isInsufficientPacks = computed(() => toValue(settings).totalPacks < guaranteedTotal.value)
  const allocatedTotal = computed(() => distribution.value.reduce((sum, packs) => sum + packs, 0))

  return { distribution, isInsufficientPacks, allocatedTotal }
}
