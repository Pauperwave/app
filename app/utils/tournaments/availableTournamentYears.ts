// app\utils\tournaments\availableTournamentYears.ts
import type { Tournament } from '~/types'

// Shared by tournaments/index.vue and locations/[slug]/index.vue's YearRangePicker (the latter
// scoped to one location): every year with a tournament plus the current year, newest first (like
// availableTransactionYears.ts)
export function availableTournamentYears(tournaments: Tournament[]): number[] {
  const years = new Set(tournaments.map(
    tournament => new Date(tournament.startDate).getFullYear()
  ))
  years.add(new Date().getFullYear())
  return [...years].sort((a, b) => b - a)
}
