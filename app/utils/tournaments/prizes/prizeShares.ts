// app\utils\tournaments\prizes\prizeShares.ts
// Keeps the per-placement shares and the pack counts linked: when a placement
// is edited, whole packs move to/from the others and the shares are derived
// from the packs that result, so every pack stays assigned.
//
// A lower placement never gets more packs than a higher one (at most as many),
// so a pack only moves when the distribution stays non-increasing.
import type { PrizeDistributionSettings } from '~/types'
import { computePrizeDistribution } from '~/utils/tournaments/prizes/prizeAllocation'
import { prizeBudgetOf } from '~/utils/tournaments/prizes/prizeBudget'

interface PackBounds {
  rewardedCount: number
  bonusPool: number
  min: number
  max: number
}

function packBoundsOf(rankedCount: number, settings: PrizeDistributionSettings): PackBounds {
  const { rewardedCount, bonusPool, bonusCap } = prizeBudgetOf(rankedCount, settings)
  const min = Math.max(0, settings.minPacksPerPlayer)
  return { rewardedCount, bonusPool, min, max: min + Math.min(bonusPool, bonusCap) }
}

function isNonIncreasing(packs: number[]): boolean {
  return packs.every((value, index) => index === 0 || value <= (packs[index - 1] ?? 0))
}

// Moves one pack to (+1) or from (-1) `rank`, or returns null if no move keeps
// the distribution valid. Who gives or takes is decided by rank, never by
// rounding: the highest placement that can do it without breaking the order
// or its bounds (gives: above the minimum; takes: under the cap).
function moveOnePack(
  packs: number[],
  rank: number,
  direction: 1 | -1,
  min: number,
  max: number
): number[] | null {
  const own = packs[rank] ?? 0
  if (direction === 1 ? own >= max : own <= min) return null

  for (let other = 0; other < packs.length; other++) {
    if (other === rank) continue

    const value = packs[other] ?? 0
    const canMove = direction === 1 ? value > min : value < max
    if (!canMove) continue

    const next = [...packs]
    next[other] = value - direction
    next[rank] = own + direction
    if (isNonIncreasing(next)) return next
  }

  return null
}

// Moves packs one at a time until `rank` reaches `target` or no move is left
function movePacks(
  packs: number[],
  rank: number,
  target: number,
  min: number,
  max: number
): number[] {
  let current = packs

  while ((current[rank] ?? 0) !== target) {
    const direction = target > (current[rank] ?? 0) ? 1 : -1
    const next = moveOnePack(current, rank, direction, min, max)
    if (!next) break
    current = next
  }

  return current
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
// difference one pack at a time from/to the others and returns the shares
// that reproduce that distribution. The placement stops at the closest count
// it can reach without putting a lower placement above a higher one.
export function sharesForPackEdit(
  rank: number,
  packs: number,
  rankedCount: number,
  settings: PrizeDistributionSettings
): number[] {
  const {
    rewardedCount, bonusPool, min, max
  } = packBoundsOf(rankedCount, settings)
  if (rank >= rewardedCount || bonusPool <= 0) return [...settings.bonusShares]

  const target = Math.min(max, Math.max(min, packs))
  const current = computePrizeDistribution(rankedCount, settings).slice(0, rewardedCount)
  const moved = movePacks(current, rank, target, min, max)

  return sharesFromPacks(moved, min, bonusPool, settings.bonusShares)
}

// Why a placement's +/- is disabled: no bonus to move, the cap or the minimum,
// or (blocked) no other placement can give/take without breaking the order
export interface PackStepBlocks {
  increase: 'noBonus' | 'cap' | 'blocked' | null
  decrease: 'noBonus' | 'atMin' | 'blocked' | null
}

export function packStepBlocksOf(
  packs: number,
  range: { min: number, max: number },
  rankedCount: number,
  settings: PrizeDistributionSettings
): PackStepBlocks {
  const { bonusPool, bonusCap } = prizeBudgetOf(rankedCount, settings)
  const min = Math.max(0, settings.minPacksPerPlayer)

  let increase: PackStepBlocks['increase'] = null
  if (packs >= range.max) {
    if (bonusPool <= 0) increase = 'noBonus'
    else if (Number.isFinite(bonusCap) && packs >= min + bonusCap) increase = 'cap'
    else increase = 'blocked'
  }

  let decrease: PackStepBlocks['decrease'] = null
  if (packs <= range.min) {
    if (bonusPool <= 0) decrease = 'noBonus'
    else if (packs <= min) decrease = 'atMin'
    else decrease = 'blocked'
  }

  return { increase, decrease }
}

// The fewest and most packs a rewarded placement can reach from the current
// distribution, one valid pack at a time
export function packRangeOf(
  rank: number,
  rankedCount: number,
  settings: PrizeDistributionSettings
): { min: number, max: number } {
  const {
    rewardedCount, bonusPool, min, max
  } = packBoundsOf(rankedCount, settings)
  const current = computePrizeDistribution(rankedCount, settings).slice(0, rewardedCount)
  const own = current[rank] ?? 0
  if (rank >= rewardedCount || bonusPool <= 0) return { min: own, max: own }

  return {
    min: movePacks(current, rank, min, min, max)[rank] ?? own,
    max: movePacks(current, rank, max, min, max)[rank] ?? own
  }
}
