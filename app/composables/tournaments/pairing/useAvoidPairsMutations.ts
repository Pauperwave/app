// app\composables\tournaments\pairing\useAvoidPairsMutations.ts
// Pinia Colada mutations for avoid-pairs, ported from league's useAvoidPairsMutations.ts: $fetch to
// the BFF endpoints, then invalidate the avoid-pairs list to refetch server truth. The payload uses
// associate uuids (like AvoidPairsSection.vue's player picker and every pairing composable); the
// BFF endpoints resolve them to players.uuid before writing
export interface AvoidPairPayload {
  playerA: string
  playerB: string
}

export function useAvoidPairsMutations() {
  const queryCache = useQueryCache()
  const invalidate = () => queryCache.invalidateQueries({ key: AVOID_PAIRS_KEY })

  const addAvoidPair = useMutation({
    mutation: (payload: AvoidPairPayload) =>
      $fetch('/api/player-avoid-pairs/create', { method: 'POST', body: payload }),
    onSettled: invalidate
  })

  const removeAvoidPair = useMutation({
    mutation: (payload: AvoidPairPayload) =>
      $fetch('/api/player-avoid-pairs/delete', { method: 'POST', body: payload }),
    onSettled: invalidate
  })

  return { addAvoidPair, removeAvoidPair }
}
