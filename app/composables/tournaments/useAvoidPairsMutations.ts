// app\composables\tournaments\useAvoidPairsMutations.ts
// Pinia Colada mutations for avoid-pairs — ported from
// MagicTheGathering/league's useAvoidPairsMutations.ts (user request,
// 2026-09-15): $fetch to the BFF endpoints, then invalidate the avoid-pairs
// list so the cache refetches server truth. Payload uses associate uuids
// (matching AvoidPairsSection.vue's player picker, itself fed by the same
// associate identity as every other pairing composable) — the BFF endpoints
// resolve those to players.uuid before writing.
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
