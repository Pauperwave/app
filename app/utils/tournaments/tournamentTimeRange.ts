// app\utils\tournaments\tournamentTimeRange.ts
import { format } from 'date-fns'

// Shared by calendar/EventDetailContent.vue (nested tournaments list) and
// calendar/TournamentDetailContent.vue (header date row)
export function tournamentTimeRange(startDate: string, endDate: string | null): string {
  const start = format(new Date(startDate), 'HH:mm')
  if (!endDate) return start

  const end = format(new Date(endDate), 'HH:mm')
  return `${start} - ${end}`
}
