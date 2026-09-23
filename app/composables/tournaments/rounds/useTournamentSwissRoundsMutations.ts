// app\composables\tournaments\rounds\useTournamentSwissRoundsMutations.ts
// Round-lifecycle writes for 1v1 Swiss-format tournaments — same shape as
// useTournamentRoundsMutations.ts (Commander), separate endpoints because
// the backing RPCs are separate (start_swiss_round_one vs
// start_commander_round_one, see migration 20260918000000).
export function useTournamentSwissRoundsMutations(tournamentUuid: MaybeRefOrGetter<string>) {
  const queryCache = useQueryCache()

  const invalidateRoundData = () => {
    queryCache.invalidateQueries({ key: TOURNAMENTS_KEY })
    queryCache.invalidateQueries({ key: TOURNAMENT_ROUNDS_KEY(toValue(tournamentUuid)) })
    queryCache.invalidateQueries({ key: TOURNAMENT_PAIRINGS_KEY(toValue(tournamentUuid)) })
    queryCache.invalidateQueries({ key: TOURNAMENT_MATCH_RESULTS_KEY(toValue(tournamentUuid)) })
  }

  const startRoundOneSwiss = useRoundLifecycleMutation<string[]>({
    endpoint: '/api/tournament-rounds/start-round-one-swiss',
    errorTitleKey: 'tournament.single.podsManager.startRoundOneErrorTitle',
    body: associateOrder => ({ tournamentUuid: toValue(tournamentUuid), associateOrder }),
    onSettled: invalidateRoundData
  })

  const advanceRoundSwiss = useRoundLifecycleMutation<{
    currentRoundNumber: number
    associateOrder?: string[]
  }>({
    endpoint: '/api/tournament-rounds/advance-round-swiss',
    errorTitleKey: 'tournament.single.roundManager.advanceRoundErrorTitle',
    body: payload => ({ tournamentUuid: toValue(tournamentUuid), ...payload }),
    onSettled: invalidateRoundData
  })

  const turnBackRoundSwiss = useRoundLifecycleMutation<number>({
    endpoint: '/api/tournament-rounds/turn-back-round-swiss',
    errorTitleKey: 'tournament.single.roundManager.turnBackRoundErrorTitle',
    body: currentRoundNumber => ({ tournamentUuid: toValue(tournamentUuid), currentRoundNumber }),
    onSettled: invalidateRoundData
  })

  return { startRoundOneSwiss, advanceRoundSwiss, turnBackRoundSwiss }
}
