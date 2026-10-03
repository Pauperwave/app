// app\composables\useStartDateField.ts
// The startDate ref + watch + formattedStartDate computed trio shared by
// events/leagues/tournaments' AddModal.vue ("Add" defaults to today). Tournaments' EditModal.vue
// uses it too, with defaultToToday: false (it starts undefined and fills in via a watch on its own
// `tournament` prop)
import { CalendarDate } from '@internationalized/date'
import type { DateValue } from '@internationalized/date'

export function useStartDateField(
  state: { startDate?: string },
  options: { defaultToToday?: boolean } = {}
) {
  const { defaultToToday = true } = options
  const initialValue = () => {
    const today = new Date()
    return defaultToToday
      ? new CalendarDate(today.getFullYear(), today.getMonth() + 1, today.getDate())
      : undefined
  }
  const startDate = shallowRef<DateValue | undefined>(initialValue())

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

  // Restores the field to its just-mounted value — used after a successful
  // "Add" submit, since the modal instance stays alive (v-model:open) and
  // would otherwise keep showing the just-submitted date on next open.
  function reset() {
    startDate.value = initialValue()
  }

  return { startDate, formattedStartDate, reset }
}
