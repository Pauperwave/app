// app\composables\leagues\useLeaguesQuery.ts
import type { League, LeagueStatus } from '~/types'

interface LeagueRow {
  id: number
  status: string
  tournament_count: number
  completed_tournament_count: number
  name: string
}

export const LEAGUES_KEY = ['leagues']

// Backed by mock data (no Supabase table yet, see server/api/leagues.ts) — still
// wrapped in useQuery (not useAsyncData) so the calling convention already
// matches the migrated domains (wanted-cards, associates): swapping the mock
// $fetch for a real Supabase read later only touches the query() body here, not
// every consumer. No mutations composable yet — nothing writable exists server-side.
export function useLeaguesQuery() {
  return useQuery({
    key: LEAGUES_KEY,
    query: async (): Promise<League[]> => {
      const rows = await $fetch<LeagueRow[]>('/api/leagues')
      return rows.map(row => ({
        id: row.id,
        status: row.status as LeagueStatus,
        name: row.name,
        tournamentCount: row.tournament_count,
        completedTournamentCount: row.completed_tournament_count
      }))
    }
  })
}
