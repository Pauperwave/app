// app\utils\tournaments\upcomingTournaments.ts
import { isFuture, isToday } from 'date-fns'
import type { Tournament } from '~/types'

// Shared by home/Player.vue and home/Staff.vue's "upcoming" widgets: today or later and not wrapped
// up (a status set a tournament never leaves)
export function upcomingTournaments(tournaments: Tournament[], limit = 5): Tournament[] {
  return tournaments
    .filter(tournament => tournament.status !== 'completed' && tournament.status !== 'cancelled'
      && (isToday(new Date(tournament.startDate)) || isFuture(new Date(tournament.startDate))))
    .slice(0, limit)
}
