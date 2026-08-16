// app\utils\dateTime.ts
import { CalendarDate, getLocalTimeZone } from '@internationalized/date'
import type { DateValue } from '@internationalized/date'

// Shared by tournaments' AddModal.vue/EditModal.vue — combines the separate
// date (UCalendar's DateValue) and "HH:mm" time string into a single Date at
// submit time.
export function combineDateAndTime(date: DateValue, time: string): Date {
  const [hours, minutes] = time.split(':').map(Number)
  const combined = dateValueToDate(date)
  combined.setHours(hours ?? 0, minutes ?? 0, 0, 0)
  return combined
}

// Shared by events/leagues' AddModal.vue, which have no separate time field.
export function dateValueToDate(date: DateValue): Date {
  return new CalendarDate(date.year, date.month, date.day).toDate(getLocalTimeZone())
}
