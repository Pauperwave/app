// app\composables\tournaments\list\useTournamentStatusSections.ts
// One section per status, most actionable first — empty statuses skipped —
// plus the flattened drawn-order range a shift-click selection resolves
// against. Shared by GridView.vue/DenseView.vue, which independently
// duplicated this exact grouping (fallow:dupes, 2026-09-23).
import type { Tournament } from '~/types'

const STATUS_ORDER: Tournament['status'][] = [
  'in_progress', 'registration_open', 'draft', 'completed', 'cancelled', 'external'
]

export function useTournamentStatusSections(tournaments: () => Tournament[]) {
  const sections = computed(() => STATUS_ORDER
    .map(status => ({
      status,
      tournaments: tournaments().filter(tournament => tournament.status === status)
    }))
    .filter(section => section.tournaments.length))

  // The ordered list a shift-click range resolves against — the currently
  // rendered (already filtered) cards flattened in drawn order, same
  // reasoning as the table's own range (useTournamentsTableColumns.ts).
  const range = computed(() => sections.value
    .flatMap(section => section.tournaments)
    .map(tournament => tournament.id))

  return { sections, range }
}
