// test\unit\server\commanders\syncWindow.test.ts
import { describe, expect, it } from 'vitest'
import { newerPastDate, syncWindowStart } from '../../../../server/utils/commanders/syncWindow'

describe('newerPastDate', () => {
  const today = '2026-10-03'

  it('takes the first past date', () => {
    expect(newerPastDate(null, '2026-09-15', today)).toBe('2026-09-15')
  })

  it('keeps the later of two past dates', () => {
    expect(newerPastDate('2026-09-15', '2026-09-01', today)).toBe('2026-09-15')
    expect(newerPastDate('2026-09-01', '2026-09-15', today)).toBe('2026-09-15')
  })

  it('ignores a future release date', () => {
    expect(newerPastDate('2026-09-15', '2026-11-09', today)).toBe('2026-09-15')
    expect(newerPastDate(null, '2026-11-09', today)).toBeNull()
  })

  it('counts today as past', () => {
    expect(newerPastDate('2026-09-15', today, today)).toBe(today)
  })
})

describe('syncWindowStart', () => {
  it('goes back the lookback days', () => {
    expect(syncWindowStart('2026-10-02', 30)).toBe('2026-09-02')
  })

  it('crosses a month and year boundary', () => {
    expect(syncWindowStart('2026-01-10', 30)).toBe('2025-12-11')
  })
})
