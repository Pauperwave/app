// test\unit\utils\events\eventScheduleDays.test.ts
import { describe, expect, it } from 'vitest'
import { eventScheduleDays } from '~/utils/events/eventScheduleDays'

// Local times (no "Z"), so the expected day keys don't depend on the machine's time zone.
describe('eventScheduleDays', () => {
  it('shows every day a multi-day event spans', () => {
    const days = eventScheduleDays({ startDate: '2026-10-02T18:00:00', endDate: '2026-10-04T20:00:00' }, [])

    expect(days).toEqual(['2026-10-02', '2026-10-03', '2026-10-04'])
  })

  it('treats an end at midnight as the evening before', () => {
    const days = eventScheduleDays({ startDate: '2026-10-14T20:00:00', endDate: '2026-10-15T00:00:00' }, [])

    expect(days).toEqual(['2026-10-14'])
  })

  it('shows just the start day when there is no end', () => {
    expect(eventScheduleDays({ startDate: '2026-10-14T20:00:00', endDate: null }, [])).toEqual(['2026-10-14'])
  })

  it('adds the days of tournaments outside the event dates, sorted and without duplicates', () => {
    const days = eventScheduleDays(
      { startDate: '2026-10-02T20:00:00', endDate: '2026-10-03T00:00:00' },
      [
        { startDate: '2026-10-04T10:00:00' },
        { startDate: '2026-10-02T21:00:00' },
        { startDate: '2026-10-03T11:00:00' }
      ]
    )

    expect(days).toEqual(['2026-10-02', '2026-10-03', '2026-10-04'])
  })

  it('caps a very long span at two weeks', () => {
    const days = eventScheduleDays({ startDate: '2026-10-01T10:00:00', endDate: '2026-12-01T10:00:00' }, [])

    expect(days).toHaveLength(14)
  })
})
