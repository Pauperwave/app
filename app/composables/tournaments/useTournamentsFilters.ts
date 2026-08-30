// app\composables\tournaments\useTournamentsFilters.ts
// fallow-ignore-file code-duplication -- mirrors useEventsFilters.ts's
// date-range/status filter shape on purpose; expected to diverge once real
// Supabase tables land
import type { Ref } from 'vue'
import type { Range, Tournament, TournamentStatus } from '~/types'

// search defaults to an unused empty ref — locations/[slug]/index.vue's own
// hosted-tournaments list only needs the range filter, not a search box.
export function useTournamentsFilters(
  data: Ref<Tournament[]>, range: Ref<Range>, search: Ref<string> = ref('')
) {
  const { t } = useI18n()

  const statusFilter = ref<'all' | TournamentStatus>('all')

  // Format isn't a fixed enum like status — it's whatever mtg_formats rows
  // exist (Draft, Commander, ... growing over time, see docs/BACKLOG.md) —
  // so the filter's own option list is derived from the data instead of a
  // hardcoded constant.
  const formatFilter = ref<'all' | string>('all')

  // Single source of truth for filtering, shared by both UTable :data and
  // GridView :tournaments — same reasoning as useWantedCardsFilters.ts. Search
  // is name-only, applied at this data level (not a UTable globalFilterFn)
  // so it also filters the grid view, not just the table.
  const filteredTournaments = computed(() => data.value.filter((tournament) => {
    if (statusFilter.value !== 'all' && tournament.status !== statusFilter.value) return false
    if (formatFilter.value !== 'all' && tournament.format !== formatFilter.value) return false
    const startDate = new Date(tournament.startDate)
    if (startDate < range.value.start || startDate > range.value.end) return false
    const query = search.value.trim().toLowerCase()
    if (query && !tournament.name.toLowerCase().includes(query)) return false
    return true
  }))

  // Counts from the full unfiltered `data`, same convention as
  // useWantedCardsFilters.ts's statusTabs.
  const statusCounts = computed(() => {
    const counts: Record<TournamentStatus, number> = {
      draft: 0, registration_open: 0, in_progress: 0, completed: 0, cancelled: 0
    }
    for (const tournament of data.value) {
      if (tournament.status in counts) counts[tournament.status]++
    }
    return counts
  })

  // Icons reused from TOURNAMENT_STATUS_ICONS — collapse to icon-only below
  // `lg` via StatusFilterGroup's own icon prop (user request, 2026-08-24).
  const statusTabs = computed<
    { label: string, value: 'all' | TournamentStatus, count?: number, icon?: string }[]
  >(() => [
    { label: t('tournament.filters.statusAll'), value: 'all', count: undefined },
    ...TOURNAMENT_STATUSES.map(status => ({
      label: t(`tournament.status.${status}`),
      value: status,
      count: statusCounts.value[status],
      icon: TOURNAMENT_STATUS_ICONS[status]
    }))
  ])

  // Sorted alphabetically, not insertion order — new formats can appear in
  // any order depending on when their mtg_formats row was created.
  const formatCounts = computed(() => {
    const counts = new Map<string, number>()
    for (const tournament of data.value) {
      counts.set(tournament.format, (counts.get(tournament.format) ?? 0) + 1)
    }
    return counts
  })

  const formatTabs = computed<{ label: string, value: 'all' | string, count?: number }[]>(() => [
    { label: t('tournament.filters.statusAll'), value: 'all', count: undefined },
    ...[...formatCounts.value.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([format, count]) => ({ label: format, value: format, count }))
  ])

  return {
    statusFilter, formatFilter, filteredTournaments, statusTabs, formatTabs
  }
}
