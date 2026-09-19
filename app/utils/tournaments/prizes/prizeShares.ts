// app\utils\tournaments\prizes\prizeShares.ts
// Keeps the per-placement shares and the pack counts linked: when a placement
// is edited, whole packs move to/from the others and the shares are derived
// from the packs that result, so every pack stays assigned.
import type { PrizeDistributionSettings } from '~/types'
import { computePrizeDistribution } from '~/utils/tournaments/prizes/prizeAllocation'
import { prizeBudgetOf } from '~/utils/tournaments/prizes/prizeBudget'

// Who gives or takes a pack is decided by rank, never by rounding: the
// highest placement (other than the edited one) that has packs above the
// minimum gives first, and the highest one still under the cap takes first.
function firstIndex(
  packs: number[],
  excluded: number,
  matches: (packs: number) => boolean
): number {
  return packs.findIndex((value, index) => index !== excluded && matches(value))
}

// Moves the packs of the rewarded placements so `rank` ends up with `target`
function movePacks(
  packs: number[],
  rank: number,
  target: number,
  min: number,
  max: number
): number[] {
  const next = [...packs]
  let delta = target - (next[rank] ?? 0)

  while (delta > 0) {
    const donor = firstIndex(next, rank, value => value > min)
    if (donor === -1) break
    next[donor] = (next[donor] ?? 0) - 1
    next[rank] = (next[rank] ?? 0) + 1
    delta -= 1
  }

  while (delta < 0) {
    const receiver = firstIndex(next, rank, value => value < max)
    if (receiver === -1) break
    next[receiver] = (next[receiver] ?? 0) + 1
    next[rank] = (next[rank] ?? 0) - 1
    delta += 1
  }

  return next
}

// The shares that reproduce exactly these packs (extra packs / bonus pool)
function sharesFromPacks(
  packs: number[],
  min: number,
  bonusPool: number,
  currentShares: number[]
): number[] {
  const next = Array.from({ length: Math.max(currentShares.length, packs.length) },
    (_, index) => currentShares[index] ?? 0)
  packs.forEach((value, rank) => {
    next[rank] = ((value - min) / bonusPool) * 100
  })
  return next
}

// Keeps packs and shares linked: asks for `packs` on a placement, moves the
// difference one pack at a time from/to the others (see firstIndex) and
// returns the shares that reproduce that distribution. Moving a placement by
// one pack therefore moves exactly one pack.
export function sharesForPackEdit(
  rank: number,
  packs: number,
  rankedCount: number,
  settings: PrizeDistributionSettings
): number[] {
  const { rewardedCount, bonusPool, bonusCap } = prizeBudgetOf(rankedCount, settings)
  if (rank >= rewardedCount || bonusPool <= 0) return [...settings.bonusShares]

  const min = Math.max(0, settings.minPacksPerPlayer)
  const max = min + Math.min(bonusPool, bonusCap)
  const target = Math.min(max, Math.max(min, packs))

  const current = computePrizeDistribution(rankedCount, settings).slice(0, rewardedCount)
  const moved = movePacks(current, rank, target, min, max)

  return sharesFromPacks(moved, min, bonusPool, settings.bonusShares)
}
