// app\composables\tournaments\useTournamentSwissRoundsMutations.ts
// Round-lifecycle writes for 1v1 Swiss-format tournaments — same shape as
// useTournamentRoundsMutations.ts (Commander), separate endpoints because
// the backing RPCs are separate (start_swiss_round_one vs
// start_commander_round_one, see migration 20260918000000).
export function useTournamentSwissRoundsMutations(tournamentUuid: MaybeRefOrGetter<string>) {
  const queryCache = useQueryCache()
  const toast = useToast()
  const { t } = useI18n()

  const invalidateRoundData = () => {
    queryCache.invalidateQueries({ key: TOURNAMENTS_KEY })
    queryCache.invalidateQueries({ key: TOURNAMENT_ROUNDS_KEY(toValue(tournamentUuid)) })
    queryCache.invalidateQueries({ key: TOURNAMENT_PAIRINGS_KEY(toValue(tournamentUuid)) })
  }

  const startRoundOneSwiss = useMutation({
    mutation: (associateOrder: string[]) =>
      $fetch('/api/tournament-rounds/start-round-one-swiss', {
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

  const advanceRoundSwiss = useMutation({
    mutation: (payload: { currentRoundNumber: number, associateOrder?: string[] }) =>
      $fetch('/api/tournament-rounds/advance-round-swiss', {
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

  const turnBackRoundSwiss = useMutation({
    mutation: (currentRoundNumber: number) =>
      $fetch('/api/tournament-rounds/turn-back-round-swiss', {
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

  return { startRoundOneSwiss, advanceRoundSwiss, turnBackRoundSwiss }
}
