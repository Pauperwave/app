// app\composables\players\usePlayersQuery.ts
// Pinia Colada query for the players domain (ADR-007/ADR-009 pattern, see
// useAssociatesQuery.ts) — reads players_full directly, a view joining the
// real players table (nickname, is_banned, user_id) with its associate
// (name, email, pauperwave_associate_number, is_active). No mutations
// composable yet — /players is read-only for now (see docs/TODO.md).
import type { Player } from '~/types'

export const PLAYERS_KEY = ['players']

export function usePlayersQuery() {
  const supabase = useSupabaseClient()

  return useQuery({
    key: PLAYERS_KEY,
    query: async (): Promise<Player[]> => {
      const { data, error } = await supabase
        .from('players_full')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      return (data ?? []) as Player[]
    }
  })
}
