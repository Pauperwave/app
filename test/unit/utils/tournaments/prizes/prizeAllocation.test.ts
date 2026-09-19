// test\unit\utils\tournaments\prizes\prizeAllocation.test.ts
import { describe, expect, it } from 'vitest'
import {
  computePrizeDistribution, DEFAULT_PRIZE_DISTRIBUTION_SETTINGS
} from '~/utils/tournaments/prizes/prizeAllocation'
import { settings, sum } from './prizeTestHelpers'

describe('computePrizeDistribution', () => {
  it('returns an empty array for zero or negative ranked players', () => {
    expect(computePrizeDistribution(0, settings({ totalPacks: 10 }))).toEqual([])
    expect(computePrizeDistribution(-1, settings({ totalPacks: 10 }))).toEqual([])
  })

  it('gives every rewarded player the guaranteed minimum when there is no bonus pool', () => {
    const result = computePrizeDistribution(4, settings({ totalPacks: 4, minPacksPerPlayer: 1 }))
    expect(result).toEqual([1, 1, 1, 1])
  })

  it('produces 7 6 5 4 3 3 3 3 with the defaults (34 packs, minimum 3, 40/30/20/10)', () => {
    const result = computePrizeDistribution(20, DEFAULT_PRIZE_DISTRIBUTION_SETTINGS)
    expect(result.slice(0, 8)).toEqual([7, 6, 5, 4, 3, 3, 3, 3])
    expect(result.slice(8)).toEqual(Array(12).fill(0))
  })

  it('always sums to exactly totalPacks (largest-remainder rounding)', () => {
    const result = computePrizeDistribution(5, settings({
      totalPacks: 17, minPacksPerPlayer: 1, bonusShares: [50, 30, 20], topCutoff: 5
    }))
    expect(sum(result)).toBe(17)
    expect(result).toHaveLength(5)
  })

  it('gives more packs to ranks with a bigger share', () => {
    const result = computePrizeDistribution(4, settings({
      totalPacks: 20, minPacksPerPlayer: 0, bonusShares: [50, 30, 15, 5], topCutoff: 4
    }))
    for (let i = 1; i < result.length; i++) {
      expect(result[i - 1]).toBeGreaterThanOrEqual(result[i] ?? 0)
    }
  })

  it('renormalizes shares that do not sum to 100', () => {
    const halved = computePrizeDistribution(4, settings({
      totalPacks: 20, minPacksPerPlayer: 0, bonusShares: [20, 15, 10, 5], topCutoff: 4
    }))
    const full = computePrizeDistribution(4, settings({
      totalPacks: 20, minPacksPerPlayer: 0, bonusShares: [40, 30, 20, 10], topCutoff: 4
    }))
    expect(halved).toEqual(full)
  })

  it('splits the bonus evenly when every share is 0, so no pack is left over', () => {
    const result = computePrizeDistribution(4, settings({
      totalPacks: 12, minPacksPerPlayer: 0, bonusShares: [0, 0, 0, 0], topCutoff: 4
    }))
    expect(result).toEqual([3, 3, 3, 3])
  })

  it('gives no packs at all to ranks beyond topCutoff', () => {
    const result = computePrizeDistribution(6, settings({
      totalPacks: 30, minPacksPerPlayer: 1, bonusShares: [70, 30], topCutoff: 2
    }))
    expect(result.slice(2)).toEqual([0, 0, 0, 0])
    expect(sum(result)).toBe(30)
  })

  it('applies the guaranteed minimum only to the rewarded placements', () => {
    const result = computePrizeDistribution(6, settings({
      totalPacks: 3, minPacksPerPlayer: 1, topCutoff: 3
    }))
    expect(result).toEqual([1, 1, 1, 0, 0, 0])
  })

  it('falls back to the guaranteed minimum when totalPacks is insufficient', () => {
    const result = computePrizeDistribution(4, settings({
      totalPacks: 0, minPacksPerPlayer: 1, topCutoff: 2
    }))
    expect(result).toEqual([1, 1, 0, 0])
  })

  it('clamps a negative minPacksPerPlayer to 0', () => {
    const result = computePrizeDistribution(2, settings({
      totalPacks: 0, minPacksPerPlayer: -5, bonusShares: [50, 50], topCutoff: 2
    }))
    expect(result).toEqual([0, 0])
  })
})

describe('computePrizeDistribution — nonRewardedMinPacks', () => {
  it('gives every non-rewarded player the minimum and still assigns every pack', () => {
    const result = computePrizeDistribution(20, settings({
      totalPacks: 40, nonRewardedMinPacks: 1
    }))
    expect(result.slice(8)).toEqual(Array(12).fill(1))
    expect(result.slice(0, 8).every(packs => packs >= 3)).toBe(true)
    expect(sum(result)).toBe(40)
  })

  it('has no effect when everyone is rewarded', () => {
    const everyone = settings({ totalPacks: 20, topCutoff: 5, nonRewardedMinPacks: 2 })
    expect(computePrizeDistribution(5, everyone)).toEqual(
      computePrizeDistribution(5, { ...everyone, nonRewardedMinPacks: 0 })
    )
  })
})

describe('computePrizeDistribution — reservedPacks', () => {
  it('keeps the reserved packs out of the distribution', () => {
    const result = computePrizeDistribution(20, settings({ reservedPacks: 4 }))
    expect(sum(result)).toBe(30)
  })
})

describe('computePrizeDistribution — maxPacksPerPlayer', () => {
  it('caps a placement and passes the surplus down, keeping the total', () => {
    const result = computePrizeDistribution(20, settings({ maxPacksPerPlayer: 6 }))
    expect(result.slice(0, 8)).toEqual([6, 6, 6, 4, 3, 3, 3, 3])
    expect(sum(result)).toBe(34)
  })

  it('never lets any rewarded placement exceed the cap', () => {
    const result = computePrizeDistribution(20, settings({ maxPacksPerPlayer: 5 }))
    expect(Math.max(...result)).toBeLessThanOrEqual(5)
    expect(sum(result)).toBe(34)
  })

  it('is ignored when it could not hold every pack', () => {
    const capped = computePrizeDistribution(20, settings({ maxPacksPerPlayer: 3 }))
    expect(capped).toEqual(computePrizeDistribution(20, settings({})))
  })

  it('treats 0 as no cap', () => {
    expect(computePrizeDistribution(20, settings({ maxPacksPerPlayer: 0 })).slice(0, 4))
      .toEqual([7, 6, 5, 4])
  })
})
