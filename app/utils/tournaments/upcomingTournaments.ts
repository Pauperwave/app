// app\utils\tournaments\upcomingTournaments.ts
import { isFuture, isToday } from 'date-fns'
import type { Tournament } from '~/types'

// Shared by home/Player.vue and home/Staff.vue's own "upcoming" widgets.
// "Upcoming" = today or later, not already wrapped up — same status set a
// tournament/event never goes back to once reached.
export function upcomingTournaments(tournaments: Tournament[], limit = 5): Tournament[] {
  return tournaments
    .filter(tournament => tournament.status !== 'completed' && tournament.status !== 'cancelled'
      && (isToday(new Date(tournament.startDate)) || isFuture(new Date(tournament.startDate))))
    .slice(0, limit)
}
