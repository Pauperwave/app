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

// Local calendar day, not toISOString().slice(0, 10) (which converts to
// UTC) — a timestamp keyed by its UTC date can land on the wrong day/weekday
// for anyone in a positive UTC-offset zone (e.g. Italy), since a UTC-day
// boundary doesn't line up with the viewer's own midnight. Shared by
// CalendarHeatmap.vue and any caller building a matching per-day lookup
// (e.g. leagues/[leagueId]/index.vue's status-colored tournament activity)
// so both sides derive the same key from the same instant.
export function toLocalDateKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// Shared by events/leagues/tournaments' list/Cover.vue for their top-left
// day/month date chip (fallow:dupes, 2026-09-03 flagged an identical clone
// across all three).
export function dayPart(startDate: string): string {
  return new Date(startDate).toLocaleDateString('it-IT', { day: '2-digit' })
}

export function monthPart(startDate: string): string {
  return new Date(startDate).toLocaleDateString('it-IT', { month: 'short' }).replace('.', '')
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
