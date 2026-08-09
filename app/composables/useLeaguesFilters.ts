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

  const statusTabs = computed<{ label: string, value: 'all' | LeagueStatus }[]>(() => [
    { label: t('league.filters.statusAll'), value: 'all' },
    { label: t('league.status.scheduled'), value: 'scheduled' },
    { label: t('league.status.ongoing'), value: 'ongoing' },
    { label: t('league.status.completed'), value: 'completed' }
  ])

  return { statusFilter, filteredLeagues, statusTabs }
}
