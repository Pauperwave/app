// app\composables\useLeaguesFilters.ts
import type { Ref } from 'vue'
import type { League, LeagueStatus } from '~/types'

export function useLeaguesFilters(data: Ref<League[]>) {
  const { t } = useI18n()

  const statusFilter = ref<'all' | LeagueStatus>('all')

  const filteredLeagues = computed(() => data.value.filter((league) => {
    if (statusFilter.value !== 'all' && league.status !== statusFilter.value) return false
    return true
  }))

  // Counts from the full unfiltered `data`, same convention as
  // useWantedCardsFilters.ts's statusTabs.
  const statusCounts = computed(() => {
    const counts: Record<LeagueStatus, number> = { scheduled: 0, ongoing: 0, completed: 0 }
    for (const league of data.value) {
      if (league.status in counts) counts[league.status]++
    }
    return counts
  })

  const statusTabs = computed<{ label: string, value: 'all' | LeagueStatus, count?: number }[]>(() => [
    { label: t('league.filters.statusAll'), value: 'all', count: undefined },
    { label: t('league.status.scheduled'), value: 'scheduled', count: statusCounts.value.scheduled },
    { label: t('league.status.ongoing'), value: 'ongoing', count: statusCounts.value.ongoing },
    { label: t('league.status.completed'), value: 'completed', count: statusCounts.value.completed }
  ])

  return { statusFilter, filteredLeagues, statusTabs }
}
