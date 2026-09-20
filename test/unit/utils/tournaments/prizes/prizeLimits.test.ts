// test\unit\utils\tournaments\prizes\prizeLimits.test.ts
import { describe, expect, it } from 'vitest'
import {
  prizeLimitStates, prizeResetTargets, prizeSettingsLimits, resolveMaxPacksPerPlayer
} from '~/utils/tournaments/prizes/prizeLimits'
import { settings } from './prizeTestHelpers'

// Defaults: 34 packs, minimum 3 for the top 8, 20 players -> 12 non-rewarded
const PLAYERS = 20

describe('prizeSettingsLimits', () => {
  it('counts the rewarded and non-rewarded players', () => {
    expect(prizeSettingsLimits(settings({}), PLAYERS))
      .toMatchObject({ rewardedCount: 8, nonRewardedCount: 12 })
  })

  it('caps the rewarded count at the players, and never goes below 1', () => {
    expect(prizeSettingsLimits(settings({ topCutoff: 8 }), 5).rewardedCount).toBe(5)
    expect(prizeSettingsLimits(settings({ topCutoff: 0 }), 5).rewardedCount).toBe(1)
  })

  it('requires the total to cover every guaranteed minimum and the reserve', () => {
    const limits = prizeSettingsLimits(
      settings({ nonRewardedMinPacks: 1, reservedPacks: 2 }),
      PLAYERS
    )
    // 8 x 3 rewarded + 12 x 1 non-rewarded + 2 reserved
    expect(limits.minTotalPacks).toBe(38)
  })

  it('caps the rewarded minimum by what the total can pay', () => {
    expect(prizeSettingsLimits(settings({}), PLAYERS).maxMinPacksPerPlayer).toBe(4)
    expect(prizeSettingsLimits(settings({ reservedPacks: 10 }), PLAYERS).maxMinPacksPerPlayer)
      .toBe(3)
  })

  it('caps the non-rewarded minimum by the packs left after the rewarded minimum', () => {
    // 34 - 24 = 10 spare packs over 12 non-rewarded players
    expect(prizeSettingsLimits(settings({}), PLAYERS).maxNonRewardedMinPacks).toBe(0)
    expect(prizeSettingsLimits(settings({ totalPacks: 60 }), PLAYERS).maxNonRewardedMinPacks)
      .toBe(3)
  })

  it('has no non-rewarded minimum to set when everyone is rewarded', () => {
    expect(prizeSettingsLimits(settings({ topCutoff: 20 }), PLAYERS).maxNonRewardedMinPacks)
      .toBe(0)
  })

  it('caps the reserve by the packs not needed by the minimums', () => {
    expect(prizeSettingsLimits(settings({}), PLAYERS).maxReservedPacks).toBe(10)
    expect(prizeSettingsLimits(settings({ nonRewardedMinPacks: 0, totalPacks: 24 }), PLAYERS)
      .maxReservedPacks).toBe(0)
  })

  it('caps how many placements the total can afford at the guaranteed minimum', () => {
    // 34 / 3 = 11 placements
    expect(prizeSettingsLimits(settings({}), PLAYERS).maxTopCutoff).toBe(11)
  })

  it('accounts for the non-rewarded minimum when counting affordable placements', () => {
    const limits = prizeSettingsLimits(
      settings({ nonRewardedMinPacks: 1, totalPacks: 40 }),
      PLAYERS
    )
    // 40 - 20 x 1 = 20 spare, each rewarded player costs 3 - 1 = 2 -> 10
    expect(limits.maxTopCutoff).toBe(10)
  })

  it('never limits the placements when the non-rewarded minimum is not lower', () => {
    const limits = prizeSettingsLimits(
      settings({ minPacksPerPlayer: 1, nonRewardedMinPacks: 1 }),
      PLAYERS
    )
    expect(limits.maxTopCutoff).toBe(20)
  })

  it('never goes below one placement, even with too few packs', () => {
    expect(prizeSettingsLimits(settings({ totalPacks: 0 }), PLAYERS).maxTopCutoff).toBe(1)
  })

  it('finds the lowest cap that can still hold every rewarded pack', () => {
    // ceil(34 / 8) = 5
    expect(prizeSettingsLimits(settings({}), PLAYERS).lowestUsefulCap).toBe(5)
    // never below the guaranteed minimum
    expect(prizeSettingsLimits(settings({ totalPacks: 24 }), PLAYERS).lowestUsefulCap).toBe(3)
  })
})

describe('prizeLimitStates', () => {
  it('reports nothing at a bound in a roomy configuration', () => {
    const states = prizeLimitStates(settings({ totalPacks: 60 }), PLAYERS)
    expect(states).toEqual({
      totalPacksAtMin: false,
      minPacksAtMin: false,
      minPacksAtMax: false,
      nonRewarded: null,
      reservedAtMax: false,
      topCutoff: null
    })
  })

  it('flags the total when it cannot go lower', () => {
    expect(prizeLimitStates(settings({ totalPacks: 24 }), PLAYERS).totalPacksAtMin).toBe(true)
  })

  it('flags the rewarded minimum when it cannot go higher', () => {
    expect(prizeLimitStates(settings({ totalPacks: 24 }), PLAYERS).minPacksAtMax).toBe(true)
  })

  it('flags "none outside the rewarded" when everyone is rewarded', () => {
    expect(prizeLimitStates(settings({ topCutoff: 20 }), PLAYERS).nonRewarded).toBe('none')
  })

  it('flags the non-rewarded minimum when the packs cannot pay more', () => {
    expect(prizeLimitStates(settings({}), PLAYERS).nonRewarded).toBe('atMax')
  })

  it('flags the reserve when no free packs are left to set aside', () => {
    expect(prizeLimitStates(settings({ totalPacks: 24 }), PLAYERS).reservedAtMax).toBe(true)
  })

  it('tells "rewarding everyone" from "limited by the packs" for the placements', () => {
    expect(prizeLimitStates(settings({ topCutoff: 20, totalPacks: 60 }), PLAYERS).topCutoff)
      .toBe('allPlayers')
    expect(prizeLimitStates(settings({ topCutoff: 11 }), PLAYERS).topCutoff).toBe('atMax')
  })
})

describe('resolveMaxPacksPerPlayer', () => {
  it('lets 0 (no cap) and useful values through', () => {
    expect(resolveMaxPacksPerPlayer(0, 7, 5)).toBe(0)
    expect(resolveMaxPacksPerPlayer(5, 0, 5)).toBe(5)
    expect(resolveMaxPacksPerPlayer(9, 7, 5)).toBe(9)
  })

  it('jumps up to the lowest useful cap when raising from "no cap"', () => {
    expect(resolveMaxPacksPerPlayer(1, 0, 5)).toBe(5)
  })

  it('drops back to "no cap" when lowering below the lowest useful cap', () => {
    expect(resolveMaxPacksPerPlayer(4, 5, 5)).toBe(0)
  })
})

describe('prizeResetTargets', () => {
  it('goes back to the starting values when the other settings allow them', () => {
    expect(prizeResetTargets(settings({ totalPacks: 50, reservedPacks: 2 }), PLAYERS)).toEqual({
      totalPacks: 34,
      reservedPacks: 0,
      minPacksPerPlayer: 3,
      nonRewardedMinPacks: 0,
      topCutoff: 8,
      maxPacksPerPlayer: 7
    })
  })

  it('never takes the total below what the minimums and the reserve need', () => {
    // 8 x 5 rewarded minimum = 40 > 34
    const targets = prizeResetTargets(settings({ totalPacks: 60, minPacksPerPlayer: 5 }), PLAYERS)
    expect(targets.totalPacks).toBe(40)
  })

  it('never takes the minimum above what the total can pay', () => {
    const targets = prizeResetTargets(settings({ totalPacks: 24, minPacksPerPlayer: 2 }), PLAYERS)
    expect(targets.minPacksPerPlayer).toBe(3)
    const tight = prizeResetTargets(settings({ totalPacks: 20, minPacksPerPlayer: 1 }), PLAYERS)
    expect(tight.minPacksPerPlayer).toBe(2)
  })

  it('never takes the reserve above the free packs', () => {
    const targets = prizeResetTargets(settings({ totalPacks: 24, reservedPacks: 0 }), PLAYERS)
    expect(targets.reservedPacks).toBe(0)
  })

  it('goes to the lowest useful cap when the starting cap could not hold every pack', () => {
    // 60 packs, minimum 3, 8 rewarded: ceil(60 / 8) = 8 > 7
    const targets = prizeResetTargets(settings({ totalPacks: 60, maxPacksPerPlayer: 0 }), PLAYERS)
    expect(targets.maxPacksPerPlayer).toBe(8)
  })

  it('keeps the starting number of rewarded placements within what the packs afford', () => {
    const targets = prizeResetTargets(settings({ totalPacks: 12, topCutoff: 2 }), PLAYERS)
    // 12 packs at a minimum of 3 afford 4 placements
    expect(targets.topCutoff).toBe(4)
  })
})

describe('a lower placement never has more packs than a higher one', () => {
  it('keeps the non-rewarded minimum at most the rewarded minimum, even with packs to spare', () => {
    // 100 packs would pay 7 to each of the 12 non-rewarded, but the rewarded minimum is 2
    const limits = prizeSettingsLimits(settings({ totalPacks: 100, minPacksPerPlayer: 2 }), PLAYERS)
    expect(limits.maxNonRewardedMinPacks).toBe(2)
  })

  it('still limits the non-rewarded minimum by the packs when they are the tighter bound', () => {
    // 34 - 24 = 10 spare packs over 12 non-rewarded players
    expect(prizeSettingsLimits(settings({}), PLAYERS).maxNonRewardedMinPacks).toBe(0)
  })

  it('stops the rewarded minimum from dropping below the non-rewarded one', () => {
    const limits = prizeSettingsLimits(
      settings({ totalPacks: 100, minPacksPerPlayer: 3, nonRewardedMinPacks: 3 }),
      PLAYERS
    )
    expect(limits.minMinPacksPerPlayer).toBe(3)
  })

  it('does not bound the rewarded minimum from below when everyone is rewarded', () => {
    const limits = prizeSettingsLimits(
      settings({ topCutoff: 20, nonRewardedMinPacks: 3 }),
      PLAYERS
    )
    expect(limits.minMinPacksPerPlayer).toBe(0)
  })

  it('flags the non-rewarded minimum when it reaches the rewarded minimum', () => {
    const states = prizeLimitStates(
      settings({ totalPacks: 100, minPacksPerPlayer: 2, nonRewardedMinPacks: 2 }),
      PLAYERS
    )
    expect(states.nonRewarded).toBe('atRewardedMin')
  })

  it('reports the ordering bound before the pack bound when both apply', () => {
    // 0 non-rewarded minimum, rewarded minimum 0: at the ordering bound too
    const states = prizeLimitStates(settings({ minPacksPerPlayer: 0 }), PLAYERS)
    expect(states.nonRewarded).toBe('atRewardedMin')
  })

  it('flags the rewarded minimum when it cannot go below the non-rewarded one', () => {
    const states = prizeLimitStates(
      settings({ totalPacks: 100, minPacksPerPlayer: 3, nonRewardedMinPacks: 3 }),
      PLAYERS
    )
    expect(states.minPacksAtMin).toBe(true)
  })

  it('does not flag the rewarded minimum at its natural floor of 0', () => {
    expect(prizeLimitStates(settings({ minPacksPerPlayer: 0 }), PLAYERS).minPacksAtMin).toBe(false)
  })

  it('resets the rewarded minimum up to the non-rewarded one when going back to 3 would break the order', () => {
    const targets = prizeResetTargets(
      settings({ totalPacks: 100, minPacksPerPlayer: 5, nonRewardedMinPacks: 5 }),
      PLAYERS
    )
    expect(targets.minPacksPerPlayer).toBe(5)
  })

  it('resets the non-rewarded minimum to at most the rewarded one', () => {
    const targets = prizeResetTargets(
      settings({ totalPacks: 100, minPacksPerPlayer: 2, nonRewardedMinPacks: 2 }),
      PLAYERS
    )
    expect(targets.nonRewardedMinPacks).toBe(0)
  })
})
