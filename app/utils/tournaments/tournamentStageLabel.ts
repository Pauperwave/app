// app\utils\tournaments\tournamentStageLabel.ts
import type { Tournament } from '~/types'

// Mutates each tournament's `stageNumber` in place (called by useTournamentsQuery.ts before
// returning the array): its 1-based position within its league by startDate, whether or not the
// name repeats.
//
// Cancelled tournaments are skipped: a cancelled stage never happened, so it gets no number and
// doesn't count toward later ones. A makeup replay still lands at its chronological position among
// the surviving stages, not necessarily reusing the cancelled stage's number.
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
    let position = 0
    for (const tournament of list) {
      if (tournament.status === 'cancelled') continue
      position += 1
      tournament.stageNumber = position
    }
  }
}

// Plain-text variant for contexts that can't render styled markup (select option label, breadcrumb,
// share-button prop); see TournamentsStageLabel.vue for the styled one
export function tournamentStageText(tournament: Tournament): string {
  return tournament.stageNumber ? ` — ${tournament.stageNumber}ª tappa` : ''
}
