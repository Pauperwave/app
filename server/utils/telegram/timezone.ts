// server\utils\telegram\timezone.ts
import { formatInTimeZone, toZonedTime, fromZonedTime } from 'date-fns-tz'
import type { Locale } from 'date-fns'

// The bot runs on Vercel (Nitro) in UTC regardless of where members are.
// Plain date-fns `format()` uses the runtime's own local timezone getters,
// so on a UTC server it silently prints UTC instead of Italy's wall clock —
// use this everywhere a `timestamptz` value gets formatted.
const TIME_ZONE = 'Europe/Rome'

export function formatTelegramDate(
  date: Date | string, formatStr: string, options?: { locale?: Locale }
): string {
  return formatInTimeZone(new Date(date), TIME_ZONE, formatStr, options)
}

// "Now", as Italy's own wall clock — for calendar boundaries (start of
// month, "today") that must match what a person in Italy means, not the
// server's UTC "now". Ordinary date-fns functions (startOfMonth, addMonths,
// format...) read this correctly regardless of the runtime's own timezone.
//
// NOT a real instant — its epoch doesn't correspond to any actual moment,
// only its wall-clock reading does. Never call .toISOString()/.getTime() on
// it directly; convert with zonedRomeTimeToInstant() first.
export function nowInRome(): Date {
  return toZonedTime(new Date(), TIME_ZONE)
}

// The other half of nowInRome() — converts a "Rome wall-clock" Date back
// into the real UTC instant it represents.
export function zonedRomeTimeToInstant(zonedDate: Date): Date {
  return fromZonedTime(zonedDate, TIME_ZONE)
}
