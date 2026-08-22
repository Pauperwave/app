// app\utils\tournaments\tournamentStageLabel.ts
import type { Tournament } from '~/types'

// Mutates each tournament's `stageNumber` in place (called once right after
// useTournamentsQuery.ts builds the array, before it's returned) — its
// 1-based position within its own league, ordered by startDate.
// Independent of whether the name repeats (user request, 2026-08-22,
// issue #52): every tournament that belongs to a league gets a stage
// number, not just ones sharing an identical name with a sibling.
//
// Cancelled tournaments are skipped entirely (2026-08-22 follow-up) — a
// cancelled stage never actually happened, so it neither gets a number
// itself nor counts toward the ones after it. Found via "Recupero terza
// tappa" (a makeup replay of a cancelled "Terza tappa"): counting the
// cancelled original gave the makeup "5ª tappa" purely from chronological
// position, reading oddly next to a name that already says "terza". Still
// not a perfect fix — the makeup lands wherever it falls chronologically
// among the surviving stages (here, "4ª"), not necessarily reusing "3ª" —
// but avoids counting a stage that was voided.
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

// Plain-text variant for contexts that can't render styled markup (a select
// option's label, a breadcrumb string, a share-button prop) — see
// TournamentsStageLabel.vue for the styled (muted, superscript "a")
// component used everywhere else.
export function tournamentStageText(tournament: Tournament): string {
  return tournament.stageNumber ? ` — ${tournament.stageNumber}ª tappa` : ''
}
