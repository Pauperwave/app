// test\unit\utils\wantedCards\wantedCardAge.test.ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { wantedCardAgeInfo } from '~/utils/wantedCards/wantedCardAge'

describe('wantedCardAgeInfo', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 8, 1))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns null for an empty date string', () => {
    expect(wantedCardAgeInfo('')).toBeNull()
  })

  it('is success under the warning threshold', () => {
    const info = wantedCardAgeInfo(new Date(2026, 7, 15).toISOString())
    expect(info?.color).toBe('success')
  })

  it('is warning between 30 and 90 days', () => {
    const info = wantedCardAgeInfo(new Date(2026, 6, 15).toISOString())
    expect(info?.color).toBe('warning')
  })

  it('is error past 90 days', () => {
    const info = wantedCardAgeInfo(new Date(2026, 0, 1).toISOString())
    expect(info?.color).toBe('error')
  })

  it('returns null for an unparseable date', () => {
    expect(wantedCardAgeInfo('not-a-date')).toBeNull()
  })
})
