// app\utils\dateTime.ts
import { CalendarDate, getLocalTimeZone } from '@internationalized/date'
import type { DateValue } from '@internationalized/date'

// Shared by tournaments' AddModal.vue/EditModal.vue: combines UCalendar's DateValue and an "HH:mm"
// string into one Date at submit time
export function combineDateAndTime(date: DateValue, time: string): Date {
  const [hours, minutes] = time.split(':').map(Number)
  const combined = dateValueToDate(date)
  combined.setHours(hours ?? 0, minutes ?? 0, 0, 0)
  return combined
}

// Shared by events/leagues' AddModal.vue, which have no separate time field
export function dateValueToDate(date: DateValue): Date {
  return new CalendarDate(date.year, date.month, date.day).toDate(getLocalTimeZone())
}

// Local calendar day, not toISOString().slice(0, 10): a timestamp keyed by its UTC date can land on
// the wrong day for positive UTC offsets (e.g. Italy). Shared by CalendarHeatmap.vue and any
// per-day lookup (e.g. the league page's status-colored activity) so both sides derive the same key
// from the same instant
export function toLocalDateKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// Shared by events/leagues/tournaments' list/Cover.vue for their top-left day/month date chip
export function dayPart(startDate: string): string {
  return new Date(startDate).toLocaleDateString('it-IT', { day: '2-digit' })
}

export function monthPart(startDate: string): string {
  return new Date(startDate).toLocaleDateString('it-IT', { month: 'short' }).replace('.', '')
}

// Tournaments' AddModal.vue/EditModal.vue: the end time is a plain "HH:mm" on the start's calendar
// day (no end-date field, like OpeningHoursEditor.vue). Rolls to the next day when earlier than the
// start (20:00 -> 01:00 ends after it starts)
export function combineEndDateAndTime(startsAt: Date, date: DateValue, time: string): Date {
  const endsAt = combineDateAndTime(date, time)
  if (endsAt <= startsAt) endsAt.setDate(endsAt.getDate() + 1)
  return endsAt
}
