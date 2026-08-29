// app\composables\useCalendarDayHighlights.ts
// Extracted out of DateRangePicker.vue and StartDatePickerField.vue
// (2026-08-29, fallow:dupes) — both dot specific calendar days with a
// status-colored UChip + hover tooltip (issue #37/#37 follow-up), with
// byte-identical grouping/lookup logic. A getter, not a plain array: both
// callers' `highlightedDates` come from a reactively-destructured prop
// (Vue 3.5+ compiler transform, project convention), which only stays
// reactive within the component that destructured it — a getter re-reads it
// on every computed re-run instead of capturing a static snapshot.
import { CalendarDate } from '@internationalized/date'
import type { DateValue } from '@internationalized/date'
import type { CalendarHighlightedDate } from '~/types'

export function useCalendarDayHighlights(highlightedDates: () => CalendarHighlightedDate[]) {
  const toCalendarDate = (date: Date) => new CalendarDate(
    date.getFullYear(),
    date.getMonth() + 1,
    date.getDate()
  )

  // CalendarDate#toString() is already a "YYYY-MM-DD" key, same format the
  // #day slot's own `day` param produces — cheaper than a per-day .some()
  // scan once highlightedDates gets into the dozens. Grouped (not deduped)
  // per day: the tooltip lists every event on a day with more than one, even
  // though the dot itself can only show one color (the last entry's).
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
