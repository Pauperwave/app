// app\utils\tournamentTimeRange.ts
import { format } from 'date-fns'

// Shared by calendar/EventDetailContent.vue (nested tournaments list) and
// calendar/TournamentDetailContent.vue (own header date row) — fallow:dupes
// flagged this as an identical clone once both were split out of
// DetailSlideover.vue (2026-08-16).
export function tournamentTimeRange(startDate: string, endDate: string | null): string {
  const start = format(new Date(startDate), 'HH:mm')
  if (!endDate) return start
  const end = format(new Date(endDate), 'HH:mm')
  return `${start} - ${end}`
}
