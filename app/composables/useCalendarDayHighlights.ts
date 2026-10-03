// app\composables\useCalendarDayHighlights.ts
// Shared by DateRangePicker.vue and StartDatePickerField.vue: both dot specific calendar days with
// a status-colored UChip + hover tooltip, with identical grouping/lookup logic. A getter, not a
// plain array: `highlightedDates` comes from a reactively-destructured prop (Vue 3.5+), which only
// stays reactive in the destructuring component, so a getter re-reads it on every computed re-run
// instead of capturing a snapshot
import { CalendarDate } from '@internationalized/date'
import type { DateValue } from '@internationalized/date'
import type { CalendarHighlightedDate } from '~/types'

export function useCalendarDayHighlights(highlightedDates: () => CalendarHighlightedDate[]) {
  const toCalendarDate = (date: Date) => new CalendarDate(
    date.getFullYear(),
    date.getMonth() + 1,
    date.getDate()
  )

  // CalendarDate#toString() is already a "YYYY-MM-DD" key, like the #day slot's `day` param:
  // cheaper than a per-day .some() scan. Grouped (not deduped) per day, so the tooltip lists every
  // event of a day though the dot shows one color (the last entry's)
  const highlightedDatesByDay = computed(() => {
    const map = new Map<string, CalendarHighlightedDate[]>()
    for (const entry of highlightedDates()) {
      const key = toCalendarDate(entry.date).toString()
      map.set(key, [...(map.get(key) ?? []), entry])
    }
    return map
  })

  function eventsFor(day: DateValue): CalendarHighlightedDate[] {
    return highlightedDatesByDay.value.get(day.toString()) ?? []
  }

  const hoveredDayKey = ref<string | null>(null)

  return { toCalendarDate, eventsFor, hoveredDayKey }
}
