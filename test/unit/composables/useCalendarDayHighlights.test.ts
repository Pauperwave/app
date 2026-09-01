// test\unit\composables\useCalendarDayHighlights.test.ts
import { CalendarDate } from '@internationalized/date'
import { describe, expect, it } from 'vitest'
import { ref } from 'vue'
import { useCalendarDayHighlights } from '~/composables/useCalendarDayHighlights'
import type { CalendarHighlightedDate } from '~/types'

describe('useCalendarDayHighlights', () => {
  it('groups entries by calendar day', () => {
    const entries: CalendarHighlightedDate[] = [
      { date: new Date(2026, 8, 1), color: 'info', label: 'Torneo A' },
      { date: new Date(2026, 8, 1), color: 'success', label: 'Torneo B' },
      { date: new Date(2026, 8, 2), color: 'error', label: 'Torneo C' }
    ]
    const { eventsFor } = useCalendarDayHighlights(() => entries)

    expect(eventsFor(new CalendarDate(2026, 9, 1))).toHaveLength(2)
    expect(eventsFor(new CalendarDate(2026, 9, 2))).toHaveLength(1)
  })

  it('returns an empty array for a day with no highlights', () => {
    const { eventsFor } = useCalendarDayHighlights(() => [])
    expect(eventsFor(new CalendarDate(2026, 9, 1))).toEqual([])
  })

  it('re-reads the getter on every reactive re-run, not a static snapshot', () => {
    const entries = ref<CalendarHighlightedDate[]>([])
    const { eventsFor } = useCalendarDayHighlights(() => entries.value)

    expect(eventsFor(new CalendarDate(2026, 9, 1))).toEqual([])

    entries.value = [{ date: new Date(2026, 8, 1), color: 'info', label: 'Added later' }]
    expect(eventsFor(new CalendarDate(2026, 9, 1))).toHaveLength(1)
  })
})
