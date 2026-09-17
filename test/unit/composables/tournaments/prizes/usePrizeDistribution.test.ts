// test\unit\composables\tournaments\prizes\usePrizeDistribution.test.ts
import { describe, expect, it } from 'vitest'
import {
  computePrizeDistribution, DEFAULT_PRIZE_DISTRIBUTION_SETTINGS
} from '~/composables/tournaments/prizes/usePrizeDistribution'
import type { PrizeDistributionSettings } from '~/types'

function settings(overrides: Partial<PrizeDistributionSettings>): PrizeDistributionSettings {
  return { ...DEFAULT_PRIZE_DISTRIBUTION_SETTINGS, ...overrides }
}

describe('computePrizeDistribution', () => {
  it('returns an empty array for zero or negative ranked players', () => {
    expect(computePrizeDistribution(0, settings({ totalPacks: 10 }))).toEqual([])
    expect(computePrizeDistribution(-1, settings({ totalPacks: 10 }))).toEqual([])
  })

  it('gives every player the guaranteed minimum when there is no bonus pool', () => {
    const result = computePrizeDistribution(4, settings({ totalPacks: 4, minPacksPerPlayer: 1 }))
    expect(result).toEqual([1, 1, 1, 1])
  })

  it('always sums to exactly totalPacks (largest-remainder rounding)', () => {
    const result = computePrizeDistribution(5, settings({
      totalPacks: 17, minPacksPerPlayer: 1, decay: 0.75, topCutoff: 5
    }))
    expect(result.reduce((sum, packs) => sum + packs, 0)).toBe(17)
    expect(result).toHaveLength(5)
  })

  it('weights earlier ranks more heavily than later ones under decay', () => {
    const result = computePrizeDistribution(4, settings({
      totalPacks: 20, minPacksPerPlayer: 0, decay: 0.5, topCutoff: 4
    }))
    for (let i = 1; i < result.length; i++) {
      expect(result[i - 1]).toBeGreaterThanOrEqual(result[i] ?? 0)
    }
  })

  it('gives no bonus packs to ranks beyond topCutoff', () => {
    const result = computePrizeDistribution(6, settings({
      totalPacks: 30, minPacksPerPlayer: 1, decay: 0.75, topCutoff: 2
    }))
    // Only the top 2 share the bonus pool; everyone else gets exactly the minimum.
    expect(result[2]).toBe(1)
    expect(result[5]).toBe(1)
  })

  it('falls back to the guaranteed minimum when totalPacks is insufficient', () => {
    const result = computePrizeDistribution(4, settings({ totalPacks: 0, minPacksPerPlayer: 1 }))
    expect(result).toEqual([1, 1, 1, 1])
  })

  it('clamps a negative minPacksPerPlayer to 0', () => {
    const result = computePrizeDistribution(2, settings({
      totalPacks: 0, minPacksPerPlayer: -5, decay: 1, topCutoff: 2
    }))
    expect(result).toEqual([0, 0])
  })
})
