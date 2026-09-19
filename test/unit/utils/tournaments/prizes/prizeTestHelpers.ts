// test\unit\utils\tournaments\prizes\prizeTestHelpers.ts
import { DEFAULT_PRIZE_DISTRIBUTION_SETTINGS } from '~/utils/tournaments/prizes/prizeAllocation'
import type { PrizeDistributionSettings } from '~/types'

export function settings(overrides: Partial<PrizeDistributionSettings>): PrizeDistributionSettings {
  return { ...DEFAULT_PRIZE_DISTRIBUTION_SETTINGS, ...overrides }
}

export function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0)
}
