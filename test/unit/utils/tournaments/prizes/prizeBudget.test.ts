// test\unit\utils\tournaments\prizes\prizeBudget.test.ts
import { describe, expect, it } from 'vitest'
import { DEFAULT_PRIZE_DISTRIBUTION_SETTINGS } from '~/utils/tournaments/prizes/prizeAllocation'
import { prizeBudgetOf, rewardedPacksRange } from '~/utils/tournaments/prizes/prizeBudget'
import { settings } from './prizeTestHelpers'

describe('prizeBudgetOf', () => {
  it('shrinks the bonus pool by what the non-rewarded players take', () => {
    const budget = prizeBudgetOf(20, settings({ totalPacks: 40, nonRewardedMinPacks: 1 }))
    expect(budget.rewardedPool).toBe(28)
    expect(budget.bonusPool).toBe(4)
  })

  it('shrinks the distributable total and the bonus pool by the reserved packs', () => {
    const budget = prizeBudgetOf(20, settings({ reservedPacks: 4 }))
    expect(budget.distributable).toBe(30)
    expect(budget.bonusPool).toBe(6)
  })

  it('counts rewarded and non-rewarded players, capped by the ranked players', () => {
    expect(prizeBudgetOf(20, settings({})))
      .toMatchObject({ rewardedCount: 8, nonRewardedCount: 12 })
    expect(prizeBudgetOf(3, settings({}))).toMatchObject({ rewardedCount: 3, nonRewardedCount: 0 })
  })

  it('turns the cap into a bonus cap, ignoring a cap that could not hold every pack', () => {
    expect(prizeBudgetOf(20, settings({ maxPacksPerPlayer: 6 })).bonusCap).toBe(3)
    expect(prizeBudgetOf(20, settings({ maxPacksPerPlayer: 3 })).bonusCap).toBe(Infinity)
    expect(prizeBudgetOf(20, settings({ maxPacksPerPlayer: 0 })).bonusCap).toBe(Infinity)
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

  it('lowers the highest pack count a rewarded placement can take with a cap', () => {
    expect(rewardedPacksRange(20, settings({ maxPacksPerPlayer: 6 }))).toEqual({ min: 3, max: 6 })
  })
})
