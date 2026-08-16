// app\composables\useStartDateField.ts
// Extracted out of events/leagues/tournaments' AddModal.vue (2026-08-16,
// fallow:dupes flagged the identical startDate ref + watch + formattedStartDate
// computed trio across all three) — the "Add" pattern defaults to today.
// tournaments' EditModal.vue also uses this (defaultToToday: false since it
// starts undefined and fills in via a watch on its own `tournament` prop
// instead — fallow:dupes flagged that duplicate watch/computed pair too).
import { CalendarDate } from '@internationalized/date'
import type { DateValue } from '@internationalized/date'

export function useStartDateField(
  state: { startDate?: string },
  options: { defaultToToday?: boolean } = {}
) {
  const { defaultToToday = true } = options
  const today = new Date()
  const startDate = shallowRef<DateValue | undefined>(
    defaultToToday
      ? new CalendarDate(today.getFullYear(), today.getMonth() + 1, today.getDate())
      : undefined
  )

  watch(startDate, (newDate) => {
    if (newDate) {
      state.startDate = `${newDate.year}-${String(newDate.month).padStart(2, '0')}-${String(newDate.day).padStart(2, '0')}`
    }
  })

  const formattedStartDate = computed(() => {
    if (!startDate.value) return ''
    const date = new Date(startDate.value.year, startDate.value.month - 1, startDate.value.day)
    return date.toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })
  })

  return { startDate, formattedStartDate }
}
