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

// Tournaments' AddModal.vue/EditModal.vue: the end time is entered as a plain
// "HH:mm" on the same calendar day as the start (no separate end-date field,
// same reasoning as OpeningHoursEditor.vue's two independent pickers). Rolls
// to the next day when earlier than the start, so a tournament running past
// midnight (e.g. 20:00 -> 01:00) still produces an end after its start.
export function combineEndDateAndTime(startsAt: Date, date: DateValue, time: string): Date {
  const endsAt = combineDateAndTime(date, time)
  if (endsAt <= startsAt) endsAt.setDate(endsAt.getDate() + 1)
  return endsAt
}
