// app\composables\tournaments\pairing\useTournamentPairingResetMutation.ts
// "Reset tavolo" (ported from league's PairingsCard.vue) clears one pairing's ranking/kills/votes;
// "Annulla Patta" has the same invalidation shape with a narrower clear (see
// undraw-pairing.post.ts)
export function useTournamentPairingResetMutation(tournamentUuid: MaybeRefOrGetter<string>) {
  const queryCache = useQueryCache()
  const toast = useToast()
  const { t } = useI18n()

  const invalidate = () => {
    queryCache.invalidateQueries({ key: TOURNAMENT_ROUND_RESULTS_KEY(toValue(tournamentUuid)) })
    queryCache.invalidateQueries({ key: TOURNAMENT_KILLS_KEY(toValue(tournamentUuid)) })
    queryCache.invalidateQueries({ key: TOURNAMENT_VOTES_KEY(toValue(tournamentUuid)) })
    queryCache.invalidateQueries({ key: TOURNAMENT_PAIRINGS_KEY(toValue(tournamentUuid)) })
  }

  const resetPairing = useMutation({
    mutation: (pairingUuid: string) =>
      $fetch('/api/tournament-rounds/reset-pairing', {
        method: 'POST',
        body: { pairingUuid }
      }),
    onError: (error) => {
      toast.add({
        title: t('tournament.single.roundManager.resetTableErrorTitle'),
        description: toErrorMessage(error),
        color: 'error'
      })
    },
    onSettled: invalidate
  })

  const undrawPairing = useMutation({
    mutation: (pairingUuid: string) =>
      $fetch('/api/tournament-rounds/undraw-pairing', {
        method: 'POST',
        body: { pairingUuid }
      }),
    onError: (error) => {
      toast.add({
        title: t('tournament.single.roundManager.undrawErrorTitle'),
        description: toErrorMessage(error),
        color: 'error'
      })
    },
    onSettled: invalidate
  })

  return { resetPairing, undrawPairing }
}
