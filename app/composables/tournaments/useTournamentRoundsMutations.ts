// app\composables\tournaments\useTournamentRoundsMutations.ts
// Round-lifecycle writes for Commander tournaments — starts with just
// round 1 (user request, 2026-09-15); advance-round/turn-back-round follow
// once round 1's own read/result-entry UI exists. Same "every write goes
// through a server/api endpoint" convention as useTournamentRegistrationsMutations.ts.
export function useTournamentRoundsMutations(tournamentUuid: MaybeRefOrGetter<string>) {
  const queryCache = useQueryCache()
  const toast = useToast()
  const { t } = useI18n()

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
    onSettled: () => queryCache.invalidateQueries({ key: TOURNAMENTS_KEY })
  })

  return { startRoundOne }
}
