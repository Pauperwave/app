// app\composables\players\usePlayersFullQuery.ts
// players_full: the public player columns plus the associate's email and number. The view follows
// the caller's RLS (migration 20261003170000), so only staff get rows: gate every use on
// 'view-players'. Kept apart from usePlayersQuery.ts, which every role reads.
import type { Player } from '~/types'

export const PLAYERS_FULL_KEY = ['players-full']

export function usePlayersFullQuery(enabled: MaybeRefOrGetter<boolean> = true) {
  const supabase = useSupabaseClient()

  return useQuery({
    key: PLAYERS_FULL_KEY,
    enabled: () => toValue(enabled),
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
