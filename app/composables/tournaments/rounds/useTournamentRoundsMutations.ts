// app\composables\tournaments\rounds\useTournamentRoundsMutations.ts
// Round-lifecycle writes for Commander tournaments — round 1 (user request,
// 2026-09-15), then advance-round/turn-back-round (2026-09-16) once round
// 1's own read/result-entry UI existed. Same "every write goes through a
// server/api endpoint" convention as useTournamentRegistrationsMutations.ts.
export function useTournamentRoundsMutations(tournamentUuid: MaybeRefOrGetter<string>) {
  const queryCache = useQueryCache()

  // Every round-lifecycle write touches rounds/pairings/results/standings —
  // invalidate all of it rather than tracking exactly which query each
  // mutation happens to touch, since they all touch most of them anyway.
  const invalidateRoundData = () => {
    queryCache.invalidateQueries({ key: TOURNAMENTS_KEY })
    queryCache.invalidateQueries({ key: TOURNAMENT_ROUNDS_KEY(toValue(tournamentUuid)) })
    queryCache.invalidateQueries({ key: TOURNAMENT_PAIRINGS_KEY(toValue(tournamentUuid)) })
    queryCache.invalidateQueries({ key: TOURNAMENT_STANDINGS_KEY(toValue(tournamentUuid)) })
  }

  const startRoundOne = useRoundLifecycleMutation<string[]>({
    endpoint: '/api/tournament-rounds/start-round-one',
    errorTitleKey: 'tournament.single.podsManager.startRoundOneErrorTitle',
    body: associateOrder => ({ tournamentUuid: toValue(tournamentUuid), associateOrder }),
    onSettled: invalidateRoundData
  })

  const advanceRound = useRoundLifecycleMutation<{
    currentRoundNumber: number
    associateOrder?: string[]
  }>({
    endpoint: '/api/tournament-rounds/advance-round',
    errorTitleKey: 'tournament.single.roundManager.advanceRoundErrorTitle',
    body: payload => ({ tournamentUuid: toValue(tournamentUuid), ...payload }),
    onSettled: invalidateRoundData
  })

  const turnBackRound = useRoundLifecycleMutation<number>({
    endpoint: '/api/tournament-rounds/turn-back-round',
    errorTitleKey: 'tournament.single.roundManager.turnBackRoundErrorTitle',
    body: currentRoundNumber => ({ tournamentUuid: toValue(tournamentUuid), currentRoundNumber }),
    onSettled: invalidateRoundData
  })

  return { startRoundOne, advanceRound, turnBackRound }
}
