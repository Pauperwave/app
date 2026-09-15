// app\composables\tournaments\useTournamentRoundsMutations.ts
// Round-lifecycle writes for Commander tournaments — round 1 (user request,
// 2026-09-15), then advance-round/turn-back-round (2026-09-16) once round
// 1's own read/result-entry UI existed. Same "every write goes through a
// server/api endpoint" convention as useTournamentRegistrationsMutations.ts.
export function useTournamentRoundsMutations(tournamentUuid: MaybeRefOrGetter<string>) {
  const queryCache = useQueryCache()
  const toast = useToast()
  const { t } = useI18n()

  // Every round-lifecycle write touches rounds/pairings/results/standings —
  // invalidate all of it rather than tracking exactly which query each
  // mutation happens to touch, since they all touch most of them anyway.
  const invalidateRoundData = () => {
    queryCache.invalidateQueries({ key: TOURNAMENTS_KEY })
    queryCache.invalidateQueries({ key: TOURNAMENT_ROUNDS_KEY(toValue(tournamentUuid)) })
    queryCache.invalidateQueries({ key: TOURNAMENT_PAIRINGS_KEY(toValue(tournamentUuid)) })
    queryCache.invalidateQueries({ key: TOURNAMENT_STANDINGS_KEY(toValue(tournamentUuid)) })
  }

  const startRoundOne = useMutation({
    mutation: (associateOrder: string[]) =>
      $fetch('/api/tournament-rounds/start-round-one', {
        method: 'POST',
        body: { tournamentUuid: toValue(tournamentUuid), associateOrder }
      }),
    onError: (error) => {
      toast.add({
        title: t('tournament.single.podsManager.startRoundOneErrorTitle'),
        description: toErrorMessage(error),
        color: 'error'
      })
    },
    onSettled: invalidateRoundData
  })

  const advanceRound = useMutation({
    mutation: (payload: { currentRoundNumber: number, associateOrder?: string[] }) =>
      $fetch('/api/tournament-rounds/advance-round', {
        method: 'POST',
        body: { tournamentUuid: toValue(tournamentUuid), ...payload }
      }),
    onError: (error) => {
      toast.add({
        title: t('tournament.single.roundManager.advanceRoundErrorTitle'),
        description: toErrorMessage(error),
        color: 'error'
      })
    },
    onSettled: invalidateRoundData
  })

  const turnBackRound = useMutation({
    mutation: (currentRoundNumber: number) =>
      $fetch('/api/tournament-rounds/turn-back-round', {
        method: 'POST',
        body: { tournamentUuid: toValue(tournamentUuid), currentRoundNumber }
      }),
    onError: (error) => {
      toast.add({
        title: t('tournament.single.roundManager.turnBackRoundErrorTitle'),
        description: toErrorMessage(error),
        color: 'error'
      })
    },
    onSettled: invalidateRoundData
  })

  return { startRoundOne, advanceRound, turnBackRound }
}
