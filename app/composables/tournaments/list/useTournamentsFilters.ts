// app\composables\tournaments\list\useTournamentsFilters.ts
// fallow-ignore-file code-duplication --
// mirrors useEventsFilters.ts's date-range/status filter shape on purpose; expected to diverge once
// real tables land
import { endOfDay, startOfDay } from 'date-fns'
import type { Ref } from 'vue'
import type { Range, Tournament, TournamentStatus } from '~/types'

// search defaults to an unused empty ref: locations/[slug]/index.vue's hosted-tournaments list only
// needs the range filter
export function useTournamentsFilters(
  data: Ref<Tournament[]>, range: Ref<Range>, search: Ref<string> = ref('')
) {
  const { t } = useI18n()

  const statusFilter = ref<'all' | TournamentStatus>('all')

  // Format isn't a fixed enum: it is whatever mtg_formats rows exist (growing, see
  // docs/BACKLOG.md), so the options derive from the data
  const formatFilter = ref<'all' | string>('all')

  // Single source of truth for filtering, shared by UTable :data and GridView :tournaments (like
  // useWantedCardsFilters.ts). Search is name-only and applied at this data level, not a UTable
  // globalFilterFn, so it also filters the grid
  const filteredTournaments = computed(() => data.value.filter((tournament) => {
    // A search looks through every tournament, ignoring the status, format and date filters.
    const query = search.value.trim().toLowerCase()
    if (query) return tournament.name.toLowerCase().includes(query)
    if (statusFilter.value !== 'all' && tournament.status !== statusFilter.value) return false
    if (formatFilter.value !== 'all' && tournament.format !== formatFilter.value) return false
    const startDate = new Date(tournament.startDate)
    // range.value.end comes from DateRangePicker.vue's CalendarDate.toDate(), i.e. midnight of the
    // picked end day: a tournament later that day (it has a real time-of-day) would fail the check
    // though its day is in range. range.value.start has the same problem the other way when it is
    // still the page's un-picked default (`new Date()`, with today's time-of-day): a tournament
    // earlier today fails
    const inRange = startDate >= startOfDay(range.value.start)
      && startDate <= endOfDay(range.value.end)
    // Pinned tournaments ignore the date range: that is the point of "In evidenza".
    return inRange || tournament.isPinned
  }))

  // Counts from the full unfiltered `data`, like useWantedCardsFilters.ts's statusTabs
  const statusCounts = computed(() => {
    const counts: Record<TournamentStatus, number> = {
      draft: 0, registration_open: 0, in_progress: 0, completed: 0, cancelled: 0, external: 0
    }
    for (const tournament of data.value) {
      if (tournament.status in counts) counts[tournament.status]++
    }
    return counts
  })

  // Icons reused from TOURNAMENT_STATUS_ICONS; icon-only below `lg` via StatusFilterGroup's icon
  // prop
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

  // Sorted alphabetically, not insertion order: new formats can appear in any order
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
