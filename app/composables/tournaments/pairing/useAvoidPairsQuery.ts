// app\composables\tournaments\pairing\useAvoidPairsQuery.ts
import type { PairingForbiddenPair } from '~/types'

// Pinia Colada query for the globally-fixed avoid-pairs list — ported from
// MagicTheGathering/league's useAvoidPairsQuery.ts (user request,
// 2026-09-15). Reads stay client -> Supabase (writes go through
// useAvoidPairsMutations.ts's BFF endpoints), same convention as every
// other use<Domain>Query.ts in this app.
//
// player_avoid_pairs.player_a_uuid/player_b_uuid key by players.uuid (player
// identity), but every other pairing/pods composable in this app
// (AcceptancePickerItem.value, TablePlayer.value, PodsManager.vue) uses the
// associate uuid as the client-side identity instead — resolved here via
// usePlayersQuery's own player_uuid <-> associate_uuid mapping rather than
// a PostgREST embed (player_avoid_pairs has two FKs to the same `players`
// table, which would need an explicit relationship-hint to disambiguate).
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
