// app\composables\useTournamentsFilters.ts
import type { Ref } from 'vue'
import type { Range, Tournament, TournamentStatus } from '~/types'

export function useTournamentsFilters(data: Ref<Tournament[]>, range: Ref<Range>) {
  const { t } = useI18n()

  const statusFilter = ref<'all' | TournamentStatus>('all')

  // Single source of truth for filtering, shared by both UTable :data and
  // GridView :tournaments — same reasoning as useWantedCardsFilters.ts.
  const filteredTournaments = computed(() => data.value.filter((tournament) => {
    if (statusFilter.value !== 'all' && tournament.status !== statusFilter.value) return false
    const startDate = new Date(tournament.startDate)
    if (startDate < range.value.start || startDate > range.value.end) return false
    return true
  }))

  const statusTabs = computed<{ label: string, value: 'all' | TournamentStatus }[]>(() => [
    { label: t('tournament.filters.statusAll'), value: 'all' },
    { label: t('tournament.status.scheduled'), value: 'scheduled' },
    { label: t('tournament.status.ongoing'), value: 'ongoing' },
    { label: t('tournament.status.completed'), value: 'completed' },
    { label: t('tournament.status.canceled'), value: 'canceled' }
  ])

  return { statusFilter, filteredTournaments, statusTabs }
}
