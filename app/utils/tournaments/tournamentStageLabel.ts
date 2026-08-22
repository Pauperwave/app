// app\utils\tournaments\tournamentStageLabel.ts
import type { Tournament } from '~/types'

// Mutates each tournament's `stageNumber` in place (called once right after
// useTournamentsQuery.ts builds the array, before it's returned) — its
// 1-based position within its own league, ordered by startDate.
// Independent of whether the name repeats (user request, 2026-08-22,
// issue #52): every tournament that belongs to a league gets a stage
// number, not just ones sharing an identical name with a sibling.
export function assignTournamentStageNumbers(tournaments: Tournament[]): void {
  const byLeague = new Map<string, Tournament[]>()
  for (const tournament of tournaments) {
    if (!tournament.leagueUuid) continue
    const list = byLeague.get(tournament.leagueUuid) ?? []
    list.push(tournament)
    byLeague.set(tournament.leagueUuid, list)
  }

  for (const list of byLeague.values()) {
    list.sort((a, b) => a.startDate.localeCompare(b.startDate))
    list.forEach((tournament, index) => {
      tournament.stageNumber = index + 1
    })
  }
}

// Plain-text variant for contexts that can't render styled markup (a select
// option's label, a breadcrumb string, a share-button prop) — see
// TournamentsStageLabel.vue for the styled (muted, superscript "a")
// component used everywhere else.
export function tournamentStageText(tournament: Tournament): string {
  return tournament.stageNumber ? ` — ${tournament.stageNumber}ª tappa` : ''
}
