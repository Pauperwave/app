// app\composables\tournaments\rounds\useTournamentKillsMutations.ts
// Kill-tracking writes, ported from league's kill flow (KillFlowCanvas.vue -> savePairingKills),
// including the @vue-flow/core canvas
export interface KillPayload {
  pairingUuid: string
  killerUuid: string
  killedPlayerUuid: string
}

export function useTournamentKillsMutations(tournamentUuid: MaybeRefOrGetter<string>) {
  const queryCache = useQueryCache()
  const invalidate = () =>
    queryCache.invalidateQueries({ key: TOURNAMENT_KILLS_KEY(toValue(tournamentUuid)) })

  const recordKill = useMutation({
    mutation: (payload: KillPayload) =>
      $fetch('/api/tournament-kills/create', {
        method: 'POST',
        body: { tournamentUuid: toValue(tournamentUuid), ...payload }
      }),
    // A recorded kill clears the table's "no kills" confirmation server-side.
    onSettled: () => {
      invalidate()
      queryCache.invalidateQueries({ key: TOURNAMENT_PAIRINGS_KEY(toValue(tournamentUuid)) })
    }
  })

  const removeKill = useMutation({
    mutation: (killUuid: string) =>
      $fetch('/api/tournament-kills/delete', { method: 'POST', body: { killUuid } }),
    onSettled: invalidate
  })

  // Confirms/retracts "no kills at this table" — lives on the pairing, so it refreshes those.
  const setNoKills = useMutation({
    mutation: (payload: { pairingUuid: string, noKills: boolean }) =>
      $fetch('/api/tournament-kills/none', { method: 'POST', body: payload }),
    onSettled: () => queryCache.invalidateQueries({
      key: TOURNAMENT_PAIRINGS_KEY(toValue(tournamentUuid))
    })
  })

  return { recordKill, removeKill, setNoKills }
}
