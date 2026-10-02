// app\composables\tournaments\useTournamentsQuery.ts
import type { Tournament, TournamentStatus } from '~/types'

export const TOURNAMENTS_KEY = ['tournaments']

// Migrated off mock data (server/api/tournaments.ts, removed) onto the real
// `tournaments` table (migration 20260815100000/20260815101000) — direct
// Supabase read + join, same pattern as useWantedCardsQuery.ts. `events` and
// `leagues` are both real now too (2026-08-15), so event_uuid/league_uuid
// resolve to real names — PublicCalendarPage.vue groups by eventUuid, not
// the name, to avoid a name-collision misgrouping.
// Test tournaments (is_test) are left out by default so calendars, stats and
// every other consumer never list them; only the tournaments list and detail
// pages opt in. RLS hides them from everyone but super_admin regardless.
export function useTournamentsQuery({ includeTest = false } = {}) {
  const supabase = useSupabaseClient()

  return useQuery({
    // Same prefix as TOURNAMENTS_KEY, so invalidating that still covers both.
    key: includeTest ? [...TOURNAMENTS_KEY, 'including-test'] : TOURNAMENTS_KEY,
    query: async (): Promise<Tournament[]> => {
      let request = supabase
        .from('tournaments')
        .select(`
          *,
          location:locations(name, address, city, province, postal_code, country, google_maps_url),
          organizer:organizations(name, type),
          format:mtg_formats(name),
          event:events(uuid, name),
          league:leagues(name)
        `)
        .is('deleted_at', null)
      if (!includeTest) request = request.eq('is_test', false)

      const { data, error } = await request
        .order('starts_at', { ascending: true })
        .order('id', { ascending: true })

      if (error) throw error

      const tournaments: Tournament[] = data.map(row => ({
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
        stageNumber: null,
        startDate: row.starts_at ?? row.created_at,
        endDate: row.ends_at,
        roundCount: row.round_count,
        roundDurationMinutes: row.round_duration_minutes,
        registeredPlayers: row.registered_players,
        organizer: row.organizer?.name ?? null,
        organizerType: row.organizer?.type ?? null,
        format: row.format?.name ?? '',
        status: row.status as TournamentStatus,
        isPinned: row.is_pinned,
        telegramNotificationsEnabled: row.telegram_notifications_enabled,
        isTest: row.is_test,
        location: row.location?.name ?? null,
        locationAddress: row.location
          ? `${row.location.address}, ${row.location.postal_code} ${row.location.city} ${row.location.province}, ${row.location.country}`
          : null,
        locationCity: row.location?.city ?? null,
        locationMapsUrl: row.location?.google_maps_url ?? null,
        entryFee: row.entry_fee,
        entryFeeNonMember: row.entry_fee_non_member,
        maxEntrants: row.max_entrants,
        decklistVisibility: row.decklist_visibility as Tournament['decklistVisibility'],
        registrationAt: row.registration_at,
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

      assignTournamentStageNumbers(tournaments)
      return tournaments
    }
  })
}
