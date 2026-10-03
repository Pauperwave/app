// app\composables\players\usePlayersQuery.ts
// Pinia Colada query for the players domain (ADR-007/ADR-009, see useAssociatesQuery.ts): reads
// players_public, a view joining the players table (user_id) with its associate's name and
// is_active. No email or associate number: those need usePlayersFullQuery.ts, for staff only. No
// mutations composable beyond delete (usePlayersMutations.ts)
import type { PlayerPublic } from '~/types'

export const PLAYERS_KEY = ['players']

export function usePlayersQuery() {
  const supabase = useSupabaseClient()

  return useQuery({
    key: PLAYERS_KEY,
    query: async (): Promise<PlayerPublic[]> => {
      const { data, error } = await supabase
        .from('players_public')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      return (data ?? []) as PlayerPublic[]
    }
  })
}
