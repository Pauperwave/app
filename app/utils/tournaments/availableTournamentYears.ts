// app\utils\tournaments\availableTournamentYears.ts
import type { Tournament } from '~/types'

// Shared by tournaments/index.vue and locations/[slug]/index.vue's own
// YearRangePicker (both work with Tournament[], the latter already scoped to
// a single location's hosted tournaments) — every year with at least one
// tournament, plus the real current year even if it's still empty, sorted
// newest first. Same shape as availableTransactionYears.ts.
export function availableTournamentYears(tournaments: Tournament[]): number[] {
  const years = new Set(tournaments.map(
    tournament => new Date(tournament.startDate).getFullYear()
  ))
  years.add(new Date().getFullYear())
  return [...years].sort((a, b) => b - a)
}
