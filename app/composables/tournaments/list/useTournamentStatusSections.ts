// app\composables\tournaments\list\useTournamentStatusSections.ts
// One section per status, most actionable first — empty statuses skipped —
// plus the flattened drawn-order range a shift-click selection resolves
// against. Shared by GridView.vue/DenseView.vue, which independently
// duplicated this exact grouping (fallow:dupes, 2026-09-23).
// Pinned tournaments get their own "In evidenza" section on top and are
// left out of their status section (user request, 2026-10-01).
import type { Tournament } from '~/types'

const STATUS_ORDER: Tournament['status'][] = [
  'in_progress', 'registration_open', 'draft', 'completed', 'cancelled', 'external'
]

export function useTournamentStatusSections(tournaments: () => Tournament[]) {
  const { t } = useI18n()

  const sections = computed(() => {
    const pinned = tournaments().filter(tournament => tournament.isPinned)
    const unpinned = tournaments().filter(tournament => !tournament.isPinned)

    const statusSections = STATUS_ORDER.map(status => ({
      key: status,
      label: t(`tournament.status.${status}`),
      color: tournamentStatusColor(status),
      icon: TOURNAMENT_STATUS_ICONS[status],
      tournaments: unpinned.filter(tournament => tournament.status === status)
    }))

    const pinnedSection = {
      key: 'pinned',
      label: t('tournament.pinned'),
      color: 'primary' as const,
      icon: ICONS.pin,
      tournaments: pinned
    }

    return [pinnedSection, ...statusSections].filter(section => section.tournaments.length)
  })

  // The ordered list a shift-click range resolves against — the currently
  // rendered (already filtered) cards flattened in drawn order, same
  // reasoning as the table's own range (useTournamentsTableColumns.ts).
  const range = computed(() => sections.value
    .flatMap(section => section.tournaments)
    .map(tournament => tournament.id))

  return { sections, range }
}
