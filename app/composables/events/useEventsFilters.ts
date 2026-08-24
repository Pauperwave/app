// app\composables\events\useEventsFilters.ts
// fallow-ignore-file code-duplication -- mirrors useTournamentsFilters.ts's
// date-range/status filter shape on purpose; expected to diverge once real
// Supabase tables land
import type { Ref } from 'vue'
import type { Event, EventStatus, Range } from '~/types'

export function useEventsFilters(data: Ref<Event[]>, range: Ref<Range>) {
  const { t } = useI18n()

  const statusFilter = ref<'all' | EventStatus>('all')

  // Single source of truth for filtering, shared by both UTable :data and
  // GridView :events — same reasoning as useTournamentsFilters.ts.
  const filteredEvents = computed(() => data.value.filter((event) => {
    if (statusFilter.value !== 'all' && event.status !== statusFilter.value) return false
    const startDate = new Date(event.startDate)
    if (startDate < range.value.start || startDate > range.value.end) return false
    return true
  }))

  // Counts from the full unfiltered `data`, same convention as
  // useWantedCardsFilters.ts's statusTabs.
  const statusCounts = computed(() => {
    const counts: Record<EventStatus, number> = {
      draft: 0, published: 0, ongoing: 0, completed: 0, cancelled: 0
    }
    for (const event of data.value) {
      if (event.status in counts) counts[event.status]++
    }
    return counts
  })

  // Icons reused from EVENT_STATUS_ICONS — collapse to icon-only below `lg`
  // via StatusFilterGroup's own icon prop (user request, 2026-08-24).
  const statusTabs = computed<
    { label: string, value: 'all' | EventStatus, count?: number, icon?: string }[]
  >(() => [
    { label: t('event.filters.statusAll'), value: 'all', count: undefined },
    ...EVENT_STATUSES.map(status => ({
      label: t(`event.status.${status}`),
      value: status,
      count: statusCounts.value[status],
      icon: EVENT_STATUS_ICONS[status]
    }))
  ])

  return { statusFilter, filteredEvents, statusTabs }
}
