// app\utils\tournaments\tournamentTableCells.ts
import { differenceInMinutes } from 'date-fns'
import type { Row } from '@tanstack/vue-table'

// Grouped rows sort by size (subRows); leaf rows have none, so a plain subRows compare left them
// all tied: sort those alphabetically, empty last.
export function sortGroupsBySizeElseText<T>(rowA: Row<T>, rowB: Row<T>, columnId: string): number {
  if (rowA.getIsGrouped() && rowB.getIsGrouped()) return rowA.subRows.length - rowB.subRows.length

  const valueA = rowA.getValue<string | null>(columnId) ?? ''
  const valueB = rowB.getValue<string | null>(columnId) ?? ''
  if (!valueA || !valueB) return valueA ? -1 : valueB ? 1 : 0

  return valueA.localeCompare(valueB, 'it')
}

// "2h 30min" / "45min": minutes rounded down, derived from start/end
export function durationLabel(startDate: string, endDate: string): string {
  const minutes = differenceInMinutes(new Date(endDate), new Date(startDate))
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60

  if (!hours) return `${rest}min`
  return rest ? `${hours}h ${rest}min` : `${hours}h`
}
