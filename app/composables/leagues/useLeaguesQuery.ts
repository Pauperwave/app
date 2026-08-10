// app\composables\leagues\useLeaguesQuery.ts
import type { League, LeagueStatus } from '~/types'

interface LeagueRow {
  id: number
  status: string
  tournament_count: number
  completed_tournament_count: number
  name: string
}

export function useLeaguesQuery() {
  const {
    data, pending: loading, error, refresh
  } = useAsyncData(
    'leagues',
    () => $fetch<LeagueRow[]>('/api/leagues'),
    { default: () => [] }
  )

  // Backed by mock data (no Supabase table yet, see server/api/leagues.ts) — mapped
  // onto the camelCase League interface, same convention as useTournamentsQuery.ts.
  const leagues = computed<League[]>(() => data.value.map(row => ({
    id: row.id,
    status: row.status as LeagueStatus,
    name: row.name,
    tournamentCount: row.tournament_count,
    completedTournamentCount: row.completed_tournament_count
  })))

  return { leagues, loading, error, refresh }
}
