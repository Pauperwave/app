// app\composables\leagues\useLeaguesQuery.ts
import type { League, LeagueStatus } from '~/types'

export const LEAGUES_KEY = ['leagues']

// Migrated off mock data (server/api/leagues.ts, removed) onto the real
// `leagues` table — direct Supabase read + join, same pattern as
// useEventsQuery.ts. tournamentCount/completedTournamentCount are derived
// from a second, lightweight tournaments read (league_uuid + status only),
// same reasoning as useEventsQuery.ts's tournamentCount.
export function useLeaguesQuery() {
  const supabase = useSupabaseClient()

  return useQuery({
    key: LEAGUES_KEY,
    query: async (): Promise<League[]> => {
      const [leaguesResult, tournamentsResult] = await Promise.all([
        supabase
          .from('leagues')
          .select('*, ruleset:rulesets(name)')
          .is('deleted_at', null)
          .order('starts_at', { ascending: true })
          .order('id', { ascending: true }),
        supabase
          .from('tournaments')
          .select('league_uuid, status')
          .not('league_uuid', 'is', null)
      ])

      if (leaguesResult.error) throw leaguesResult.error
      if (tournamentsResult.error) throw tournamentsResult.error

      const totals = new Map<string, number>()
      const completed = new Map<string, number>()
      for (const row of tournamentsResult.data) {
        if (!row.league_uuid) continue
        totals.set(row.league_uuid, (totals.get(row.league_uuid) ?? 0) + 1)
        if (row.status === 'completed') {
          completed.set(row.league_uuid, (completed.get(row.league_uuid) ?? 0) + 1)
        }
      }

      return leaguesResult.data.map(row => ({
        id: row.id,
        uuid: row.uuid,
        status: row.status as LeagueStatus,
        name: row.name,
        // starts_at is nullable at the DB level but every insert sets it
        // (see AddModal.vue) — created_at is only a fallback for rows
        // predating that, so EditModal.vue's date picker always has a value.
        startDate: row.starts_at ?? row.created_at,
        ruleset: row.ruleset?.name ?? null,
        rulesetUuid: row.ruleset_uuid,
        image: row.image_url,
        tournamentCount: totals.get(row.uuid) ?? 0,
        completedTournamentCount: completed.get(row.uuid) ?? 0
      }))
    }
  })
}
