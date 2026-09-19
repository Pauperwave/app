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

describe('sharesForPackEdit — who gives and who takes', () => {
  const noCap = settings({ maxPacksPerPlayer: 0 })

  function packsAfter(
    rank: number,
    packs: number,
    base = noCap
  ): number[] {
    const bonusShares = sharesForPackEdit(rank, packs, 20, base)
    return computePrizeDistribution(20, { ...base, bonusShares }).slice(0, 8)
  }

  it('takes the pack from the first placement when giving one to a lower one', () => {
    // 7 6 5 4 3 3 3 3 -> #5 goes to 4, #1 gives one
    expect(packsAfter(4, 4)).toEqual([6, 6, 5, 4, 4, 3, 3, 3])
  })

  it('takes the pack from the next placement when the first one is edited', () => {
    expect(packsAfter(0, 8)).toEqual([8, 5, 5, 4, 3, 3, 3, 3])
  })

  it('skips the placements already at the guaranteed minimum', () => {
    const concentrated = settings({
      maxPacksPerPlayer: 0, bonusShares: [0, 100, 0, 0, 0, 0, 0, 0]
    })
    // 3 13 3 3 3 3 3 3: only #2 has packs above the minimum to give
    expect(packsAfter(4, 4, concentrated)).toEqual([3, 12, 3, 3, 4, 3, 3, 3])
  })

  it('gives a released pack to the first placement still under the cap', () => {
    const capped = settings({})
    // cap 7: #1 is full, so lowering #4 (4 -> 3) hands its pack to #2
    expect(packsAfter(3, 3, capped)).toEqual([7, 7, 5, 3, 3, 3, 3, 3])
  })

  it('goes back to where it started after +1 then -1 on the same placement', () => {
    const before = computePrizeDistribution(20, noCap).slice(0, 8)
    const up = sharesForPackEdit(4, 4, 20, noCap)
    const upSettings = { ...noCap, bonusShares: up }
    const down = sharesForPackEdit(4, 3, 20, upSettings)

    expect(computePrizeDistribution(20, { ...noCap, bonusShares: down }).slice(0, 8))
      .toEqual(before)
  })

  it('moves several packs one at a time, the highest placement giving until its minimum', () => {
    expect(packsAfter(4, 6)).toEqual([4, 6, 5, 4, 6, 3, 3, 3])
  })

  it('never lets a placement give below the guaranteed minimum', () => {
    const packs = packsAfter(4, 13)
    expect(packs.every(value => value >= 3)).toBe(true)
    expect(sum(packs)).toBe(34)
  })
})
