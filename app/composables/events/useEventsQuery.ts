// app\composables\events\useEventsQuery.ts
import type { Event, EventStatus } from '~/types'

export const EVENTS_KEY = ['events']

// Migrated off mock data (server/api/events.ts, removed) onto the real
// `events` table — direct Supabase read + join, same pattern as
// useTournamentsQuery.ts. tournamentCount is derived from a second, lightweight
// read (just the event_uuid column) rather than a stored counter column —
// Supabase JS has no GROUP BY, so counting client-side is simplest for the
// handful of rows either table is expected to have.
export function useEventsQuery() {
  const supabase = useSupabaseClient()

  return useQuery({
    key: EVENTS_KEY,
    query: async (): Promise<Event[]> => {
      const [eventsResult, tournamentsResult] = await Promise.all([
        supabase
          .from('events')
          .select(`
            *,
            location:locations(name, address, city, province, postal_code, country),
            organizer:organizations(name)
          `)
          .is('deleted_at', null)
          .order('starts_at', { ascending: true })
          .order('id', { ascending: true }),
        supabase
          .from('tournaments')
          .select('event_uuid')
          .not('event_uuid', 'is', null)
      ])

      if (eventsResult.error) throw eventsResult.error
      if (tournamentsResult.error) throw tournamentsResult.error

      const tournamentCounts = new Map<string, number>()
      for (const row of tournamentsResult.data) {
        if (!row.event_uuid) continue
        tournamentCounts.set(row.event_uuid, (tournamentCounts.get(row.event_uuid) ?? 0) + 1)
      }

      return eventsResult.data.map(row => ({
        id: row.id,
        uuid: row.uuid,
        status: row.status as EventStatus,
        name: row.name,
        startDate: row.starts_at ?? row.created_at,
        endDate: row.ends_at,
        tournamentCount: tournamentCounts.get(row.uuid) ?? 0,
        organizer: row.organizer?.name ?? null,
        location: row.location?.name ?? null,
        locationAddress: row.location
          ? `${row.location.address}, ${row.location.postal_code} ${row.location.city} ${row.location.province}, ${row.location.country}`
          : null,
        image: row.image_url,
        companionCode: row.companion_app_code
      }))
    }
  })
}
