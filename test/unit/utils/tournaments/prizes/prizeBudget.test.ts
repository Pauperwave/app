// test\unit\utils\tournaments\prizes\prizeBudget.test.ts
import { describe, expect, it } from 'vitest'
import { prizeBudgetOf } from '~/utils/tournaments/prizes/prizeBudget'
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
