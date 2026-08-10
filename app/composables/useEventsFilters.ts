// app\composables\useEventsFilters.ts
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
      scheduled: 0, ongoing: 0, completed: 0, canceled: 0
    }
    for (const event of data.value) {
      if (event.status in counts) counts[event.status]++
    }
    return counts
  })

  const statusTabs = computed<{ label: string, value: 'all' | EventStatus, count?: number }[]>(() => [
    { label: t('event.filters.statusAll'), value: 'all', count: undefined },
    { label: t('event.status.scheduled'), value: 'scheduled', count: statusCounts.value.scheduled },
    { label: t('event.status.ongoing'), value: 'ongoing', count: statusCounts.value.ongoing },
    { label: t('event.status.completed'), value: 'completed', count: statusCounts.value.completed },
    { label: t('event.status.canceled'), value: 'canceled', count: statusCounts.value.canceled }
  ])

  return { statusFilter, filteredEvents, statusTabs }
}
