// app\composables\events\useEventsFilters.ts
// fallow-ignore-file code-duplication -- mirrors
// useTournamentsFilters.ts's date-range/status filter shape on purpose; expected to diverge
import { endOfDay, startOfDay } from 'date-fns'
import type { Ref } from 'vue'
import type { Event, EventStatus, Range } from '~/types'

export function useEventsFilters(data: Ref<Event[]>, range: Ref<Range>, search: Ref<string>) {
  const { t } = useI18n()

  const statusFilter = ref<'all' | EventStatus>('all')

  // Single source of truth for filtering, shared by UTable :data and GridView :events (like
  // useTournamentsFilters.ts). Search is name-only and applied here, so it also filters the grid
  const filteredEvents = computed(() => data.value.filter((event) => {
    // A search looks through every event, ignoring the status and date filters.
    const query = search.value.trim().toLowerCase()
    if (query) return event.name.toLowerCase().includes(query)
    if (statusFilter.value !== 'all' && event.status !== statusFilter.value) return false
    const startDate = new Date(event.startDate)
    // See useTournamentsFilters.ts: both range bounds land at an exact moment (midnight for a
    // picked end day, "now" for the un-picked default start), so both need bumping to
    // start/end-of-day
    const inRange = startDate >= startOfDay(range.value.start)
      && startDate <= endOfDay(range.value.end)
    return inRange
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

  // Icons reused from EVENT_STATUS_ICONS; icon-only below `lg` via StatusFilterGroup's icon prop
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
