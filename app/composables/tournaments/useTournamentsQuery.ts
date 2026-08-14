// app\composables\tournaments\useTournamentsQuery.ts
import type { Tournament, TournamentStatus } from '~/types'

interface TournamentRow {
  id: number
  uuid: string
  event: string | null
  league: string | null
  name: string
  start_date: string
  end_date: string
  round_count: number
  round_duration: number
  registered_players: number
  organizer: string
  format: string
  status: string
  location: string
  entry_fee: number
  description: string
  prizes: string
  companion_code: string | null
  image: string | null
  participants: string[]
  contact_name: string | null
  contact_phone: string | null
}

export const TOURNAMENTS_KEY = ['tournaments']

// Backed by mock data (no Supabase table yet, see server/api/tournaments.ts) —
// still wrapped in useQuery (not useAsyncData) so the calling convention already
// matches the migrated domains (wanted-cards, associates): swapping the mock
// $fetch for a real Supabase read later only touches the query() body here, not
// every consumer. No mutations composable yet — nothing writable exists server-side.
export function useTournamentsQuery() {
  return useQuery({
    key: TOURNAMENTS_KEY,
    query: async (): Promise<Tournament[]> => {
      const rows = await $fetch<TournamentRow[]>('/api/tournaments')
      return rows.map(row => ({
        id: row.id,
        uuid: row.uuid,
        event: row.event,
        league: row.league,
        name: row.name,
        startDate: row.start_date,
        endDate: row.end_date,
        roundCount: row.round_count,
        roundDuration: row.round_duration,
        registeredPlayers: row.registered_players,
        organizer: row.organizer,
        format: row.format,
        status: row.status as TournamentStatus,
        location: row.location,
        entryFee: row.entry_fee,
        description: row.description,
        prizes: row.prizes,
        companionCode: row.companion_code,
        image: row.image,
        participants: row.participants,
        contactName: row.contact_name,
        contactPhone: row.contact_phone
      }))
    }
  })
}
