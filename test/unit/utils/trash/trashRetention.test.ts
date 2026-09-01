// test\unit\utils\trash\trashRetention.test.ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { trashRetentionInfo } from '~/utils/trash/trashRetention'

describe('trashRetentionInfo', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 8, 1))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('is success when plenty of days remain', () => {
    const info = trashRetentionInfo(new Date(2026, 8, 1).toISOString(), 60)
    expect(info.daysRemaining).toBe(60)
    expect(info.color).toBe('success')
  })

  it('is warning within 7 days of expiry', () => {
    // 54 days before "now" (2026-09-01), leaving 6 of the 60-day window.
    const deletedAt = new Date(2026, 6, 9).toISOString()
    const info = trashRetentionInfo(deletedAt, 60)
    expect(info.daysRemaining).toBe(6)
    expect(info.color).toBe('warning')
  })

  it('is error once the retention window has passed, floored at 0', () => {
    const deletedAt = new Date(2026, 0, 1).toISOString()
    const info = trashRetentionInfo(deletedAt, 60)
    expect(info.daysRemaining).toBe(0)
    expect(info.color).toBe('error')
  })
})
