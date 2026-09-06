// server\utils\telegram\timezone.ts
import { formatInTimeZone } from 'date-fns-tz'
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
