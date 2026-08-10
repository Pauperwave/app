// app\composables\events\useEventsQuery.ts
import type { Event, EventStatus } from '~/types'

interface EventRow {
  id: number
  status: string
  tournament_count: number
  name: string
  start_date: string
}

export function useEventsQuery() {
  const {
    data, pending: loading, error, refresh
  } = useAsyncData(
    'events',
    () => $fetch<EventRow[]>('/api/events'),
    { default: () => [] }
  )

  // Backed by mock data (no Supabase table yet, see server/api/events.ts) — mapped
  // onto the camelCase Event interface, same convention as useLeaguesQuery.ts.
  const events = computed<Event[]>(() => data.value.map(row => ({
    id: row.id,
    status: row.status as EventStatus,
    name: row.name,
    startDate: row.start_date,
    tournamentCount: row.tournament_count
  })))

  return { events, loading, error, refresh }
}
