// app\composables\tournaments\useTournamentsQuery.ts
import type { Tournament, TournamentStatus } from '~/types'

export const TOURNAMENTS_KEY = ['tournaments']

// Migrated off mock data (server/api/tournaments.ts, removed) onto the real
// `tournaments` table (migration 20260815100000/20260815101000) — direct
// Supabase read + join, same pattern as useWantedCardsQuery.ts. `events` and
// `leagues` are both real now too (2026-08-15), so event_uuid/league_uuid
// resolve to real names — PublicCalendarPage.vue groups by eventUuid, not
// the name, to avoid a name-collision misgrouping.
export function useTournamentsQuery() {
  const supabase = useSupabaseClient()

  return useQuery({
    key: TOURNAMENTS_KEY,
    query: async (): Promise<Tournament[]> => {
      const { data, error } = await supabase
        .from('tournaments')
        .select(`
          *,
          location:locations(name, address, city, province, postal_code, country, google_maps_url),
          organizer:organizations(name),
          format:mtg_formats(name),
          event:events(uuid, name),
          league:leagues(name)
        `)
        .is('deleted_at', null)
        .order('starts_at', { ascending: true })
        .order('id', { ascending: true })

      if (error) throw error

      return data.map(row => ({
        id: row.id,
        uuid: row.uuid,
        event: row.event?.name ?? null,
        eventUuid: row.event?.uuid ?? null,
        league: row.league?.name ?? null,
        leagueUuid: row.league_uuid,
        formatUuid: row.format_uuid,
        organizerUuid: row.organizer_uuid,
        locationUuid: row.location_uuid,
        name: row.name,
        startDate: row.starts_at ?? row.created_at,
        endDate: row.ends_at,
        roundCount: row.round_count,
        registeredPlayers: row.registered_players,
        organizer: row.organizer?.name ?? null,
        format: row.format?.name ?? '',
        status: row.status as TournamentStatus,
        location: row.location?.name ?? null,
        locationAddress: row.location
          ? `${row.location.address}, ${row.location.postal_code} ${row.location.city} ${row.location.province}, ${row.location.country}`
          : null,
        locationMapsUrl: row.location?.google_maps_url ?? null,
        entryFee: row.entry_fee,
        description: row.description,
        prizes: row.prizes,
        companionCode: row.companion_code,
        image: row.image_url,
        imageCardName: row.image_card_name,
        imageCardArtist: row.image_card_artist,
        participants: row.participant_names ?? [],
        contactName: row.contact_name,
        contactPhone: row.contact_phone
      }))
    }
  })
}
