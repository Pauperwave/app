// app\composables\useTournamentsQuery.ts
import type { Tournament, TournamentStatus } from '~/types'

interface TournamentRow {
  id: number
  uuid: string
  event: string | null
  league: string | null
  name: string
  start_date: string
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
}

export function useTournamentsQuery() {
  const {
    data, pending: loading, error, refresh
  } = useAsyncData(
    'tournaments',
    () => $fetch<TournamentRow[]>('/api/tournaments'),
    { default: () => [] }
  )

  // Backed by mock data (no Supabase table yet, see server/api/tournaments.ts) —
  // mapped onto the camelCase Tournament interface, same convention as
  // useWantedCardsQuery.ts for the real Supabase-backed domain.
  const tournaments = computed<Tournament[]>(() => data.value.map(row => ({
    id: row.id,
    uuid: row.uuid,
    event: row.event,
    league: row.league,
    name: row.name,
    startDate: row.start_date,
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
    companionCode: row.companion_code
  })))

  return { tournaments, loading, error, refresh }
}
