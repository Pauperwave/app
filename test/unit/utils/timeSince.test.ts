// test\unit\utils\timeSince.test.ts
import { describe, expect, it } from 'vitest'
import { timeSince } from '~/utils/timeSince'

const NOW = new Date('2026-09-19T12:00:00Z')

function since(isoDate: string) {
  return timeSince(isoDate, NOW)
}

describe('timeSince', () => {
  it('reads under a minute as "now"', () => {
    expect(since('2026-09-19T11:59:30Z')).toEqual({ unit: 'now', count: 0 })
    expect(since('2026-09-19T12:00:00Z')).toEqual({ unit: 'now', count: 0 })
  })

  it('reads a date in the future as "now", not a negative amount', () => {
    expect(since('2026-09-19T12:30:00Z')).toEqual({ unit: 'now', count: 0 })
  })

  it('expresses under an hour in minutes', () => {
    expect(since('2026-09-19T11:59:00Z')).toEqual({ unit: 'minutes', count: 1 })
    expect(since('2026-09-19T11:15:00Z')).toEqual({ unit: 'minutes', count: 45 })
    expect(since('2026-09-19T11:00:01Z')).toEqual({ unit: 'minutes', count: 59 })
  })

  it('expresses from one hour up to a day in hours', () => {
    expect(since('2026-09-19T11:00:00Z')).toEqual({ unit: 'hours', count: 1 })
    expect(since('2026-09-19T00:00:00Z')).toEqual({ unit: 'hours', count: 12 })
    expect(since('2026-09-18T12:00:01Z')).toEqual({ unit: 'hours', count: 23 })
  })

  it('drops the minutes once it reaches hours (whole units only)', () => {
    expect(since('2026-09-19T08:30:00Z')).toEqual({ unit: 'hours', count: 3 })
  })

  it('expresses from one day up to a month in days', () => {
    expect(since('2026-09-18T12:00:00Z')).toEqual({ unit: 'days', count: 1 })
    expect(since('2026-09-05T12:00:00Z')).toEqual({ unit: 'days', count: 14 })
    expect(since('2026-08-20T12:00:00Z')).toEqual({ unit: 'days', count: 30 })
  })

  it('expresses from one month up to a year in months', () => {
    expect(since('2026-08-19T12:00:00Z')).toEqual({ unit: 'months', count: 1 })
    expect(since('2026-03-19T12:00:00Z')).toEqual({ unit: 'months', count: 6 })
    expect(since('2025-09-20T12:00:00Z')).toEqual({ unit: 'months', count: 11 })
  })

  it('expresses a year or more in years', () => {
    expect(since('2025-09-19T12:00:00Z')).toEqual({ unit: 'years', count: 1 })
    expect(since('2023-01-01T00:00:00Z')).toEqual({ unit: 'years', count: 3 })
  })

  it('returns null for an unparseable date', () => {
    expect(since('')).toBeNull()
    expect(since('not a date')).toBeNull()
  })
})
