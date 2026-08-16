// app\composables\useStartDateField.ts
// Extracted out of events/leagues/tournaments' AddModal.vue (2026-08-16,
// fallow:dupes flagged the identical startDate ref + watch + formattedStartDate
// computed trio across all three) — the "Add" pattern specifically: defaults
// to today. Not used by EditModal.vue variants, which start undefined and
// fill in via a watch on their own entity prop instead.
import { CalendarDate } from '@internationalized/date'
import type { DateValue } from '@internationalized/date'

export function useStartDateField(state: { startDate?: string }) {
  const today = new Date()
  const startDate = shallowRef<DateValue>(
    new CalendarDate(today.getFullYear(), today.getMonth() + 1, today.getDate())
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
