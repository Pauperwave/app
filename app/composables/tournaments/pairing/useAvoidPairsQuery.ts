// app\composables\tournaments\pairing\useAvoidPairsQuery.ts
import type { PairingForbiddenPair } from '~/types'

// Pinia Colada query for the globally-fixed avoid-pairs list, ported from league's
// useAvoidPairsQuery.ts. Reads go client -> Supabase (writes via useAvoidPairsMutations.ts's BFF
// endpoints).
//
// player_avoid_pairs keys by players.uuid, but every other pairing/pods composable
// (AcceptancePickerItem.value, TablePlayer.value, PodsManager.vue) uses the associate uuid:
// resolved here via usePlayersQuery's player_uuid <-> associate_uuid mapping, not a PostgREST embed
// (two FKs to `players` would need a relationship hint)
export const AVOID_PAIRS_KEY = ['avoid-pairs']

export function useAvoidPairsQuery() {
  const supabase = useSupabaseClient()
  const { data: playersData } = usePlayersQuery()

  return useQuery({
    key: AVOID_PAIRS_KEY,
    query: async (): Promise<PairingForbiddenPair[]> => {
      const { data, error } = await supabase
        .from('player_avoid_pairs')
        .select('player_a_uuid, player_b_uuid')

      if (error) throw error

      const associateUuidByPlayerUuid = new Map(
        (playersData.value ?? []).map(player => [player.uuid, player.associate_uuid])
      )

      return (data ?? [])
        .map((row) => {
          const playerA = associateUuidByPlayerUuid.get(row.player_a_uuid)
          const playerB = associateUuidByPlayerUuid.get(row.player_b_uuid)
          return playerA && playerB ? { playerA, playerB } : null
        })
        .filter((pair): pair is PairingForbiddenPair => pair !== null)
    }
  })
}
