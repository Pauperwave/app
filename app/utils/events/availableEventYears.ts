// app\utils\events\availableEventYears.ts
import type { Event } from '~/types'

// Shared by events/index.vue's YearRangePicker: every year with an event plus the current year,
// newest first (like availableTransactionYears.ts)
export function availableEventYears(events: Event[]): number[] {
  const years = new Set(events.map(
    event => new Date(event.startDate).getFullYear()
  ))
  years.add(new Date().getFullYear())
  return [...years].sort((a, b) => b - a)
}
