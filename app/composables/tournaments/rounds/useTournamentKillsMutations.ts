// app\composables\tournaments\rounds\useTournamentKillsMutations.ts
// Kill-tracking writes — ported from MagicTheGathering/league's kill flow
// (KillFlowCanvas.vue -> savePairingKills) (user request, 2026-09-15/16:
// copy the kill-tracking logic as-is, including the @vue-flow/core canvas).
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
    onSettled: invalidate
  })

  const removeKill = useMutation({
    mutation: (killUuid: string) =>
      $fetch('/api/tournament-kills/delete', { method: 'POST', body: { killUuid } }),
    onSettled: invalidate
  })

  return { recordKill, removeKill }
}
