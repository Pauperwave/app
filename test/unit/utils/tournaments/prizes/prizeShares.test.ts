// test\unit\utils\tournaments\prizes\prizeShares.test.ts
import { describe, expect, it } from 'vitest'
import {
  computePrizeDistribution, DEFAULT_PRIZE_DISTRIBUTION_SETTINGS
} from '~/utils/tournaments/prizes/prizeAllocation'
import { packRangeOf, packStepBlocksOf, sharesForPackEdit } from '~/utils/tournaments/prizes/prizeShares'
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
    expect(distributionAfter(3, 0)[3]).toBe(3)
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

  it('skips a giver that would end up below the placement under it', () => {
    const tied = settings({
      maxPacksPerPlayer: 0, bonusShares: [50, 50, 0, 0, 0, 0, 0, 0]
    })
    // 8 8 3 3 ...: #1 giving would leave it under #2, so #2 gives
    expect(packsAfter(2, 4, tied)).toEqual([8, 7, 4, 3, 3, 3, 3, 3])
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

  it('stops at the placement above when asked for more than it can reach', () => {
    // #5 cannot pass #4, which has 4
    expect(packsAfter(4, 6)).toEqual([6, 6, 5, 4, 4, 3, 3, 3])
  })

  it('never lets a placement give below the guaranteed minimum', () => {
    const packs = packsAfter(4, 13)
    expect(packs.every(value => value >= 3)).toBe(true)
    expect(sum(packs)).toBe(34)
  })
})

describe('sharesForPackEdit — a lower placement never has more packs', () => {
  function stepAll(base: ReturnType<typeof settings>, steps: number): number[][] {
    let current = base
    const history: number[][] = []
    const directions = [1, -1, 1, 1, -1, -1, 1, -1] as const

    for (let step = 0; step < steps; step++) {
      const rank = (step * 3) % 8
      const packs = computePrizeDistribution(20, current)[rank] ?? 0
      const direction = directions[step % directions.length] ?? 1
      current = { ...current, bonusShares: sharesForPackEdit(rank, packs + direction, 20, current) }
      history.push(computePrizeDistribution(20, current).slice(0, 8))
    }

    return history
  }

  it('keeps the placements in non-increasing order after every step', () => {
    for (const packs of stepAll(settings({}), 60)) {
      expect(packs).toEqual([...packs].sort((a, b) => b - a))
    }
  })

  it('keeps every pack assigned and every placement within its bounds', () => {
    for (const packs of stepAll(settings({}), 60)) {
      expect(sum(packs)).toBe(34)
      expect(packs.every(value => value >= 3 && value <= 7)).toBe(true)
    }
  })

  it('does not raise a placement above the one before it', () => {
    // 7 6 5 4 3 3 3 3: #5 can reach 4 (level with #4) but not 5
    const first = sharesForPackEdit(4, 4, 20, settings({}))
    const raised = { ...settings({}), bonusShares: first }
    const second = sharesForPackEdit(4, 5, 20, raised)

    expect(computePrizeDistribution(20, { ...raised, bonusShares: second })[4]).toBe(4)
  })
})

describe('packRangeOf', () => {
  const rangeOf = (rank: number) => packRangeOf(rank, 20, settings({}))

  it('lets a placement move between its neighbours and the bounds', () => {
    // 7 6 5 4 3 3 3 3, minimum 3, cap 7
    expect(rangeOf(0)).toEqual({ min: 6, max: 7 })
    expect(rangeOf(1)).toEqual({ min: 5, max: 7 })
    expect(rangeOf(3)).toEqual({ min: 3, max: 5 })
    expect(rangeOf(4)).toEqual({ min: 3, max: 4 })
  })

  it('has no range to move in outside the rewarded placements', () => {
    expect(rangeOf(12)).toEqual({ min: 0, max: 0 })
  })

  it('has no range to move in without a bonus pool', () => {
    const noBonus = settings({ totalPacks: 24 })
    expect(packRangeOf(0, 20, noBonus)).toEqual({ min: 3, max: 3 })
  })
})

describe('packStepBlocksOf', () => {
  function blocksOf(rank: number, custom = settings({})) {
    const packs = computePrizeDistribution(20, custom)[rank] ?? 0
    return packStepBlocksOf(packs, packRangeOf(rank, 20, custom), 20, custom)
  }

  it('blames the cap when the first placement is already at it', () => {
    // 7 6 5 4 3 3 3 3 with a cap of 7
    expect(blocksOf(0).increase).toBe('cap')
  })

  it('has nothing to explain while a step is possible', () => {
    expect(blocksOf(1)).toEqual({ increase: null, decrease: null })
  })

  it('blames the minimum when a placement is already at it', () => {
    expect(blocksOf(7).decrease).toBe('atMin')
  })

  it('blames the missing bonus pool when there is none', () => {
    expect(blocksOf(0, settings({ totalPacks: 24 }))).toEqual({
      increase: 'noBonus',
      decrease: 'noBonus'
    })
  })

  it('reports a blocked step when no other placement can give without breaking the order', () => {
    // No cap: the first can't go up because everyone else is already at the minimum
    const noCap = settings({ maxPacksPerPlayer: 0, bonusShares: [100] })
    expect(blocksOf(0, noCap).increase).toBe('blocked')
  })
})
