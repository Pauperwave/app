// test\unit\utils\events\eventIcs.test.ts
import { describe, expect, it } from 'vitest'
import { googleCalendarUrl, type CalendarIcsItem } from '~/utils/events/eventIcs'

function makeItem(overrides: Partial<CalendarIcsItem>): CalendarIcsItem {
  return {
    id: 1,
    name: 'Torneo Pauper',
    startDate: '2026-06-18T18:00:00.000Z',
    endDate: null,
    location: 'Trento',
    ...overrides
  }
}

describe('googleCalendarUrl', () => {
  it('builds a TEMPLATE render URL with the item name, dates, and location', () => {
    const url = googleCalendarUrl(makeItem({}))
    const params = new URL(url).searchParams
    expect(url.startsWith('https://calendar.google.com/calendar/render?')).toBe(true)
    expect(params.get('action')).toBe('TEMPLATE')
    expect(params.get('text')).toBe('Torneo Pauper')
    expect(params.get('location')).toBe('Trento')
    expect(params.get('dates')).toBe('20260618T180000Z/20260618T200000Z')
  })

  it('defaults the end time to 2 hours after start when endDate is missing', () => {
    const url = googleCalendarUrl(makeItem({ startDate: '2026-06-18T18:00:00.000Z', endDate: null }))
    const dates = new URL(url).searchParams.get('dates')
    expect(dates).toBe('20260618T180000Z/20260618T200000Z')
  })

  it('uses the real end date when one is provided', () => {
    const url = googleCalendarUrl(makeItem({
      startDate: '2026-06-18T18:00:00.000Z', endDate: '2026-06-18T23:00:00.000Z'
    }))
    const dates = new URL(url).searchParams.get('dates')
    expect(dates).toBe('20260618T180000Z/20260618T230000Z')
  })

  it('falls back to an empty location when none is given', () => {
    const url = googleCalendarUrl(makeItem({ location: null }))
    expect(new URL(url).searchParams.get('location')).toBe('')
  })
})
