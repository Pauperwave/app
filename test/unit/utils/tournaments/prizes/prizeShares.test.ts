// test\unit\utils\tournaments\prizes\prizeShares.test.ts
import { describe, expect, it } from 'vitest'
import {
  computePrizeDistribution, DEFAULT_PRIZE_DISTRIBUTION_SETTINGS
} from '~/utils/tournaments/prizes/prizeAllocation'
import { sharesForPackEdit } from '~/utils/tournaments/prizes/prizeShares'
import { settings, sum } from './prizeTestHelpers'

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

  it('clamps a requested pack count to a custom cap', () => {
    const capped = settings({ maxPacksPerPlayer: 6 })
    const bonusShares = sharesForPackEdit(0, 99, 20, capped)
    expect(computePrizeDistribution(20, { ...capped, bonusShares })[0]).toBe(6)
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
