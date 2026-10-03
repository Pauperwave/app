// app\composables\tournaments\rounds\useTournamentRoundsMutations.ts
// Round-lifecycle writes for Commander tournaments (round 1, advance-round, turn-back-round): every
// write goes through a server/api endpoint, like useTournamentRegistrationsMutations.ts
export function useTournamentRoundsMutations(tournamentUuid: MaybeRefOrGetter<string>) {
  const invalidateRoundData = useInvalidateRoundData(
    tournamentUuid,
    TOURNAMENT_STANDINGS_KEY
  )

  const startRoundOne = useRoundLifecycleMutation<{
    associateOrder: string[]
    tableSizes: number[]
    shuffleSeed: number | null
  }>({
    endpoint: '/api/tournament-rounds/start-round-one',
    errorTitleKey: 'tournament.single.podsManager.startRoundOneErrorTitle',
    body: payload => ({ tournamentUuid: toValue(tournamentUuid), ...payload }),
    onSettled: invalidateRoundData
  })

  const advanceRound = useRoundLifecycleMutation<{
    currentRoundNumber: number
    associateOrder?: string[]
    tableSizes?: number[]
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

  const reopenTournament = useRoundLifecycleMutation<undefined>({
    endpoint: '/api/tournament-rounds/reopen',
    errorTitleKey: 'tournament.single.roundManager.reopenTournamentErrorTitle',
    body: () => ({ tournamentUuid: toValue(tournamentUuid) }),
    onSettled: invalidateRoundData
  })

  return { startRoundOne, advanceRound, turnBackRound, reopenTournament }
}
