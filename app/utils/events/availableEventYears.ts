// app\utils\events\availableEventYears.ts
import type { Event } from '~/types'

// Shared by events/index.vue's own YearRangePicker — every year with at
// least one event, plus the real current year even if it's still empty,
// sorted newest first. Same shape as availableTransactionYears.ts.
export function availableEventYears(events: Event[]): number[] {
  const years = new Set(events.map(
    event => new Date(event.startDate).getFullYear()
  ))
  years.add(new Date().getFullYear())
  return [...years].sort((a, b) => b - a)
}
