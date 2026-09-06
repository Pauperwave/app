// server\utils\telegram\timezone.ts
import { formatInTimeZone, toZonedTime, fromZonedTime } from 'date-fns-tz'
import type { Locale } from 'date-fns'

// The bot runs on Vercel (Nitro), whose functions execute in UTC regardless
// of where the club/its members actually are. Plain date-fns `format()`
// renders a Date using the *runtime's own* local timezone getters, so on a
// UTC server it silently prints UTC wall-clock time instead of Italy's —
// confirmed 2026-09-06 via /status: a commit made at 13:53 CEST displayed
// as "11:53" (exactly the UTC offset) in the bot's own build-info line.
// Every tournament/event date the bot shows comes from a `timestamptz`
// column (a real UTC instant, not a naive wall-clock string), so this
// wasn't specific to /status — formatTelegramDate replaces every bare
// `format(new Date(x), ...)` call across commands/*.ts that touches one.
const TIME_ZONE = 'Europe/Rome'

export function formatTelegramDate(
  date: Date | string, formatStr: string, options?: { locale?: Locale }
): string {
  return formatInTimeZone(new Date(date), TIME_ZONE, formatStr, options)
}

// "Now", as Italy's own wall clock — for computing calendar boundaries
// (start of month, "today", ...) that have to match what a person in Italy
// calls "this month", not the server's own UTC "now" (Vercel). Confirmed
// 2026-09-06: date-fns-tz v3's toZonedTime() returns a Date whose *local*
// getters (and anything built from it via ordinary date-fns functions —
// startOfMonth, addMonths, endOfMonth, format, ...) read out Italy's wall
// clock correctly, regardless of the runtime's own timezone — verified
// under both TZ=Europe/Rome and TZ=UTC.
//
// The Date this returns is NOT a real instant, though — its raw epoch does
// not correspond to any actual moment, only its wall-clock reading does.
// Never call .toISOString()/.getTime() on it (or on a boundary computed
// from it) directly; convert back with zonedRomeTimeToInstant() first for
// anything going into a Supabase query or a comparison against a real
// timestamptz value (e.g. `new Date(row.starts_at)`).
export function nowInRome(): Date {
  return toZonedTime(new Date(), TIME_ZONE)
}

// The other half of nowInRome() — converts a "Rome wall-clock" Date (that
// function's own return value, or any date-fns boundary computed from it)
// back into the real UTC instant it represents.
export function zonedRomeTimeToInstant(zonedDate: Date): Date {
  return fromZonedTime(zonedDate, TIME_ZONE)
}
