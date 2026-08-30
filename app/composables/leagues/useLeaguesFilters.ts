// app\composables\leagues\useLeaguesFilters.ts
import type { Ref } from 'vue'
import type { League, LeagueStatus } from '~/types'

export function useLeaguesFilters(data: Ref<League[]>, search: Ref<string>) {
  const { t } = useI18n()

  const statusFilter = ref<'all' | LeagueStatus>('all')

  // Search is name-only, applied here (not a UTable globalFilterFn) so it
  // also filters the grid view, same reasoning as useTournamentsFilters.ts.
  const filteredLeagues = computed(() => data.value.filter((league) => {
    if (statusFilter.value !== 'all' && league.status !== statusFilter.value) return false
    const query = search.value.trim().toLowerCase()
    if (query && !league.name.toLowerCase().includes(query)) return false
    return true
  }))

  // Counts from the full unfiltered `data`, same convention as
  // useWantedCardsFilters.ts's statusTabs.
  const statusCounts = computed(() => {
    const counts: Record<LeagueStatus, number> = { draft: 0, active: 0, completed: 0, cancelled: 0 }
    for (const league of data.value) {
      if (league.status in counts) counts[league.status]++
    }
    return counts
  })

  // Icons reused from LEAGUE_STATUS_ICONS — collapse to icon-only below `lg`
  // via StatusFilterGroup's own icon prop (user request, 2026-08-24).
  const statusTabs = computed<
    { label: string, value: 'all' | LeagueStatus, count?: number, icon?: string }[]
  >(() => [
    { label: t('league.filters.statusAll'), value: 'all', count: undefined },
    ...LEAGUE_STATUSES.map(status => ({
      label: t(`league.status.${status}`),
      value: status,
      count: statusCounts.value[status],
      icon: LEAGUE_STATUS_ICONS[status]
    }))
  ])

  return { statusFilter, filteredLeagues, statusTabs }
}
