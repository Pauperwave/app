// server\utils\telegram\timezone.ts
import { formatInTimeZone, toZonedTime, fromZonedTime } from 'date-fns-tz'
import type { Locale } from 'date-fns'

// The bot runs on Vercel (Nitro) in UTC. Plain date-fns `format()` uses the runtime's local
// timezone, so on a UTC server it prints UTC instead of Italy's wall clock: use this wherever a
// `timestamptz` is formatted.
const TIME_ZONE = 'Europe/Rome'

export function formatTelegramDate(
  date: Date | string, formatStr: string, options?: { locale?: Locale }
): string {
  return formatInTimeZone(new Date(date), TIME_ZONE, formatStr, options)
}

// "Now" as Italy's wall clock, for calendar boundaries (start of month, "today") that must match
// what a person in Italy means. Ordinary date-fns functions read it correctly in any runtime
// timezone.
//
// NOT a real instant: only its wall-clock reading is meaningful. Never call
// .toISOString()/.getTime() on it; convert with zonedRomeTimeToInstant() first.
export function nowInRome(): Date {
  return toZonedTime(new Date(), TIME_ZONE)
}

// The other half of nowInRome(): converts a "Rome wall-clock" Date back into the real UTC instant
export function zonedRomeTimeToInstant(zonedDate: Date): Date {
  return fromZonedTime(zonedDate, TIME_ZONE)
}
