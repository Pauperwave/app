// test\unit\composables\tournaments\prizes\usePrizeDistribution.test.ts
import { describe, expect, it } from 'vitest'
import {
  computePrizeDistribution, DEFAULT_PRIZE_DISTRIBUTION_SETTINGS, prizeBudgetOf, rewardedPacksRange,
  sharesForPackEdit
} from '~/composables/tournaments/prizes/usePrizeDistribution'
import type { PrizeDistributionSettings } from '~/types'

function settings(overrides: Partial<PrizeDistributionSettings>): PrizeDistributionSettings {
  return { ...DEFAULT_PRIZE_DISTRIBUTION_SETTINGS, ...overrides }
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0)
}

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

describe('rewardedPacksRange', () => {
  it('goes from the guaranteed minimum up to the default cap of 7', () => {
    expect(rewardedPacksRange(20, DEFAULT_PRIZE_DISTRIBUTION_SETTINGS)).toEqual({ min: 3, max: 7 })
  })

  it('goes up to the minimum plus the whole bonus pool without a cap', () => {
    expect(rewardedPacksRange(20, settings({ maxPacksPerPlayer: 0 }))).toEqual({ min: 3, max: 13 })
  })

  it('caps the rewarded count at the number of ranked players', () => {
    const base = settings({ totalPacks: 12, minPacksPerPlayer: 3, topCutoff: 8 })
    expect(rewardedPacksRange(3, base)).toEqual({ min: 3, max: 6 })
  })
})

describe('sharesForPackEdit', () => {
  // No cap here, so the packs the tests ask for aren't clamped by the default 7
  const base = settings({ maxPacksPerPlayer: 0 })

  function distributionAfter(rank: number, packs: number): number[] {
    const bonusShares = sharesForPackEdit(rank, packs, 20, base)
    return computePrizeDistribution(20, { ...base, bonusShares })
  }

  it('gives the edited rank exactly the requested packs and keeps the total', () => {
    const result = distributionAfter(0, 9)
    expect(result[0]).toBe(9)
    expect(sum(result)).toBe(34)
    expect(result.slice(1, 8).every(packs => packs >= 3)).toBe(true)
  })

  it('moves exactly one pack from another rank when a rank goes up by one', () => {
    const before = computePrizeDistribution(20, base)
    const after = distributionAfter(0, (before[0] ?? 0) + 1)
    const diffs = after.map((packs, rank) => packs - (before[rank] ?? 0))

    expect(diffs[0]).toBe(1)
    expect(diffs.filter(diff => diff === -1)).toHaveLength(1)
    expect(diffs.filter(diff => diff === 0)).toHaveLength(diffs.length - 2)
  })

  it('gives exactly one pack to another rank when a rank goes down by one', () => {
    const before = computePrizeDistribution(20, base)
    const after = distributionAfter(3, (before[3] ?? 0) - 1)
    const diffs = after.map((packs, rank) => packs - (before[rank] ?? 0))

    expect(diffs[3]).toBe(-1)
    expect(diffs.filter(diff => diff === 1)).toHaveLength(1)
    expect(diffs.filter(diff => diff === 0)).toHaveLength(diffs.length - 2)
  })

  it('snaps every share to the whole packs it produces', () => {
    const shares = sharesForPackEdit(0, 9, 20, base)
    const result = computePrizeDistribution(20, { ...base, bonusShares: shares })
    result.slice(0, 8).forEach((packs, rank) => {
      expect(shares[rank]).toBeCloseTo(((packs - 3) / 10) * 100)
    })
  })

  it('keeps the shares summing to 100', () => {
    const shares = sharesForPackEdit(0, 9, 20, base)
    expect(sum(shares.slice(0, 8))).toBeCloseTo(100)
  })

  it('clamps a pack count beyond the maximum to the whole bonus pool', () => {
    expect(distributionAfter(0, 99)[0]).toBe(13)
  })

  it('clamps a pack count to the default cap of 7', () => {
    const bonusShares = sharesForPackEdit(0, 99, 20, DEFAULT_PRIZE_DISTRIBUTION_SETTINGS)
    const result = computePrizeDistribution(20, {
      ...DEFAULT_PRIZE_DISTRIBUTION_SETTINGS, bonusShares
    })
    expect(result[0]).toBe(7)
  })

  it('clamps a pack count below the guaranteed minimum to the minimum', () => {
    expect(distributionAfter(0, 0)[0]).toBe(3)
  })

  it('works when the other ranks had 0%', () => {
    const custom = settings({ bonusShares: [100, 0, 0, 0, 0, 0, 0, 0] })
    const bonusShares = sharesForPackEdit(0, 6, 20, custom)
    const result = computePrizeDistribution(20, { ...custom, bonusShares })
    expect(result[0]).toBe(6)
    expect(sum(result)).toBe(34)
  })

  it('leaves the shares untouched for ranks outside the rewarded placements', () => {
    const shares = sharesForPackEdit(12, 5, 20, base)
    expect(shares.slice(0, 8)).toEqual([40, 30, 20, 10, 0, 0, 0, 0])
  })

  it('returns the shares unchanged when there is no bonus pool', () => {
    const noBonus = settings({ totalPacks: 24 })
    expect(sharesForPackEdit(0, 5, 20, noBonus)).toEqual(noBonus.bonusShares)
  })
})

describe('nonRewardedMinPacks', () => {
  it('gives every non-rewarded player the minimum and still assigns every pack', () => {
    const result = computePrizeDistribution(20, settings({
      totalPacks: 40, nonRewardedMinPacks: 1
    }))
    expect(result.slice(8)).toEqual(Array(12).fill(1))
    expect(result.slice(0, 8).every(packs => packs >= 3)).toBe(true)
    expect(sum(result)).toBe(40)
  })

  it('shrinks the bonus pool by what the non-rewarded players take', () => {
    const budget = prizeBudgetOf(20, settings({ totalPacks: 40, nonRewardedMinPacks: 1 }))
    expect(budget.rewardedPool).toBe(28)
    expect(budget.bonusPool).toBe(4)
  })

  it('has no effect when everyone is rewarded', () => {
    const everyone = settings({ totalPacks: 20, topCutoff: 5, nonRewardedMinPacks: 2 })
    expect(computePrizeDistribution(5, everyone)).toEqual(
      computePrizeDistribution(5, { ...everyone, nonRewardedMinPacks: 0 })
    )
  })
})

describe('reservedPacks', () => {
  it('keeps the reserved packs out of the distribution', () => {
    const result = computePrizeDistribution(20, settings({ reservedPacks: 4 }))
    expect(sum(result)).toBe(30)
  })

  it('shrinks the distributable total and the bonus pool', () => {
    const budget = prizeBudgetOf(20, settings({ reservedPacks: 4 }))
    expect(budget.distributable).toBe(30)
    expect(budget.bonusPool).toBe(6)
  })
})

describe('maxPacksPerPlayer', () => {
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

  it('lowers the highest pack count a rewarded placement can take', () => {
    expect(rewardedPacksRange(20, settings({ maxPacksPerPlayer: 6 }))).toEqual({ min: 3, max: 6 })
  })

  it('clamps a requested pack count to the cap', () => {
    const base = settings({ maxPacksPerPlayer: 6 })
    const bonusShares = sharesForPackEdit(0, 99, 20, base)
    expect(computePrizeDistribution(20, { ...base, bonusShares })[0]).toBe(6)
  })
})
