// app\utils\timeSince.ts
// "How long ago" as ONE relevant unit: minutes under an hour, hours under a
// day, days under a month, months under a year, then years. Whole units only
// (floored), unlike date-fns' formatDistanceToNow, which rounds fuzzily
// ("circa 2 ore"). Returns a unit + count so the caller formats it with its
// own i18n plurals.
import {
  differenceInDays, differenceInHours, differenceInMinutes, differenceInMonths,
  differenceInYears, isValid, parseISO
} from 'date-fns'

export type TimeSinceUnit = 'now' | 'minutes' | 'hours' | 'days' | 'months' | 'years'

export interface TimeSince {
  unit: TimeSinceUnit
  count: number
}

export function timeSince(isoDate: string, now: Date = new Date()): TimeSince | null {
  const date = parseISO(isoDate)
  if (!isValid(date)) return null

  // A date in the future (clock skew) reads as "just now" rather than negative
  const minutes = differenceInMinutes(now, date)
  if (minutes < 1) return { unit: 'now', count: 0 }
  if (minutes < 60) return { unit: 'minutes', count: minutes }

  const hours = differenceInHours(now, date)
  if (hours < 24) return { unit: 'hours', count: hours }

  const months = differenceInMonths(now, date)
  if (months < 1) return { unit: 'days', count: differenceInDays(now, date) }
  if (months < 12) return { unit: 'months', count: months }

  return { unit: 'years', count: differenceInYears(now, date) }
}
