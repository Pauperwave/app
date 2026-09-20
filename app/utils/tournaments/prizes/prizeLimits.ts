// app\utils\tournaments\prizes\prizeLimits.ts
// Bounds of the prize settings controls, so no combination that could not be
// paid out (guaranteed minimums + reserve > total packs) can be reached, and
// which controls sit at a bound (the UI explains why the +/- is disabled).
import type { PrizeDistributionSettings } from '~/types'
import { DEFAULT_PRIZE_DISTRIBUTION_SETTINGS } from '~/utils/tournaments/prizes/prizeAllocation'
import { prizeBudgetOf } from '~/utils/tournaments/prizes/prizeBudget'

export interface PrizeSettingsLimits {
  // At least 1: the settings always reward someone
  rewardedCount: number
  nonRewardedCount: number
  minTotalPacks: number
  maxMinPacksPerPlayer: number
  maxNonRewardedMinPacks: number
  maxReservedPacks: number
  maxTopCutoff: number
  // Lowest cap that can hold every rewarded pack; a lower one would be ignored
  lowestUsefulCap: number
}

export function prizeSettingsLimits(
  settings: PrizeDistributionSettings,
  playerCount: number
): PrizeSettingsLimits {
  const {
    minPacksPerPlayer, nonRewardedMinPacks, totalPacks, reservedPacks
  } = settings

  const rewardedCount = Math.max(1, Math.min(settings.topCutoff, playerCount))
  const nonRewardedCount = Math.max(0, playerCount - rewardedCount)
  const rewardedGuaranteed = minPacksPerPlayer * rewardedCount
  const nonRewardedGuaranteed = nonRewardedMinPacks * nonRewardedCount

  const minTotalPacks = rewardedGuaranteed + nonRewardedGuaranteed + reservedPacks

  const maxMinPacksPerPlayer = Math.max(0, Math.floor(
    (totalPacks - reservedPacks - nonRewardedGuaranteed) / rewardedCount
  ))

  const maxNonRewardedMinPacks = nonRewardedCount === 0
    ? 0
    : Math.max(0, Math.floor((totalPacks - reservedPacks - rewardedGuaranteed) / nonRewardedCount))

  const maxReservedPacks = Math.max(0, totalPacks - rewardedGuaranteed - nonRewardedGuaranteed)

  // Every extra rewarded player costs (minimum - non-rewarded minimum) packs
  let maxTopCutoff = Math.max(1, playerCount)
  if (minPacksPerPlayer > nonRewardedMinPacks) {
    const spare = totalPacks - reservedPacks - nonRewardedMinPacks * playerCount
    const affordable = Math.floor(spare / (minPacksPerPlayer - nonRewardedMinPacks))
    maxTopCutoff = Math.max(1, Math.min(playerCount, affordable))
  }

  const { rewardedPool } = prizeBudgetOf(playerCount, settings)
  const lowestUsefulCap = Math.max(minPacksPerPlayer, Math.ceil(rewardedPool / rewardedCount))

  return {
    rewardedCount,
    nonRewardedCount,
    minTotalPacks,
    maxMinPacksPerPlayer,
    maxNonRewardedMinPacks,
    maxReservedPacks,
    maxTopCutoff,
    lowestUsefulCap
  }
}

export interface PrizeLimitStates {
  totalPacksAtMin: boolean
  minPacksAtMax: boolean
  // 'none' = nobody is outside the rewarded placements
  nonRewarded: 'none' | 'atMax' | null
  reservedAtMax: boolean
  // 'allPlayers' = already rewarding everyone, 'atMax' = limited by the packs
  topCutoff: 'allPlayers' | 'atMax' | null
}

// Which controls are at a bound right now — what the tooltips explain
export function prizeLimitStates(
  settings: PrizeDistributionSettings,
  playerCount: number
): PrizeLimitStates {
  const limits = prizeSettingsLimits(settings, playerCount)

  let nonRewarded: PrizeLimitStates['nonRewarded'] = null
  if (limits.nonRewardedCount === 0) nonRewarded = 'none'
  else if (settings.nonRewardedMinPacks >= limits.maxNonRewardedMinPacks) nonRewarded = 'atMax'

  let topCutoff: PrizeLimitStates['topCutoff'] = null
  if (limits.rewardedCount >= limits.maxTopCutoff) {
    topCutoff = limits.maxTopCutoff >= playerCount ? 'allPlayers' : 'atMax'
  }

  return {
    totalPacksAtMin: settings.totalPacks <= limits.minTotalPacks,
    minPacksAtMax: settings.minPacksPerPlayer >= limits.maxMinPacksPerPlayer,
    nonRewarded,
    reservedAtMax: settings.reservedPacks >= limits.maxReservedPacks,
    topCutoff
  }
}

// 0 turns the cap off; a value below the lowest useful cap jumps up to it when
// going up, and back to 0 when going down
export function resolveMaxPacksPerPlayer(
  value: number,
  current: number,
  lowestUsefulCap: number
): number {
  const isUnusable = value > 0 && value < lowestUsefulCap
  if (!isUnusable) return value
  return value > current ? lowestUsefulCap : 0
}

export interface PrizeResetTargets {
  totalPacks: number
  reservedPacks: number
  minPacksPerPlayer: number
  nonRewardedMinPacks: number
  topCutoff: number
  maxPacksPerPlayer: number
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

// The value each setting goes back to: its starting value, or the closest one
// the other settings still allow (e.g. the total can't drop below what the
// minimums need, so it goes to that instead)
export function prizeResetTargets(
  settings: PrizeDistributionSettings,
  playerCount: number
): PrizeResetTargets {
  const defaults = DEFAULT_PRIZE_DISTRIBUTION_SETTINGS
  const limits = prizeSettingsLimits(settings, playerCount)
  const cap = defaults.maxPacksPerPlayer

  return {
    totalPacks: Math.max(defaults.totalPacks, limits.minTotalPacks),
    reservedPacks: clamp(defaults.reservedPacks, 0, limits.maxReservedPacks),
    minPacksPerPlayer: clamp(defaults.minPacksPerPlayer, 0, limits.maxMinPacksPerPlayer),
    nonRewardedMinPacks: clamp(defaults.nonRewardedMinPacks, 0, limits.maxNonRewardedMinPacks),
    topCutoff: clamp(defaults.topCutoff, 1, limits.maxTopCutoff),
    // 0 means "no cap"; a starting cap too low to hold every pack goes up to the lowest useful
    maxPacksPerPlayer: cap > 0 && cap < limits.lowestUsefulCap ? limits.lowestUsefulCap : cap
  }
}
