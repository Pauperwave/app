// app\composables\events\useEventsQuery.ts
import type { Event, EventStatus } from '~/types'

interface EventRow {
  id: number
  status: string
  tournament_count: number
  name: string
  start_date: string
  location: string
  image: string | null
}

export const EVENTS_KEY = ['events']

// Backed by mock data (no Supabase table yet, see server/api/events.ts) — still
// wrapped in useQuery (not useAsyncData) so the calling convention already
// matches the migrated domains (wanted-cards, associates): swapping the mock
// $fetch for a real Supabase read later only touches the query() body here, not
// every consumer. No mutations composable yet — nothing writable exists server-side.
export function useEventsQuery() {
  return useQuery({
    key: EVENTS_KEY,
    query: async (): Promise<Event[]> => {
      const rows = await $fetch<EventRow[]>('/api/events')
      return rows.map(row => ({
        id: row.id,
        status: row.status as EventStatus,
        name: row.name,
        startDate: row.start_date,
        tournamentCount: row.tournament_count,
        location: row.location,
        image: row.image
      }))
    }
  })
}
