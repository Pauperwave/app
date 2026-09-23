// app\composables\tournaments\rounds\useTournamentMatchResultsMutations.ts
export interface MatchResultPayload {
  pairingUuid: string
  player1Uuid: string
  player2Uuid: string
  player1GamesWon: number
  player2GamesWon: number
}

export function useTournamentMatchResultsMutations(tournamentUuid: MaybeRefOrGetter<string>) {
  const queryCache = useQueryCache()
  const toast = useToast()
  const { t } = useI18n()
  const resultsKey = () => TOURNAMENT_MATCH_RESULTS_KEY(toValue(tournamentUuid))

  const saveMatchResult = useMutation({
    mutation: (payload: MatchResultPayload) =>
      $fetch('/api/tournament-match-results/upsert', {
        method: 'POST',
        body: { tournamentUuid: toValue(tournamentUuid), ...payload }
      }),
    onMutate({ pairingUuid, player1GamesWon, player2GamesWon }) {
      // An in-flight refetch would overwrite the optimistic value with stale data
      queryCache.cancelQueries({ key: resultsKey() })
      const previous = queryCache.getQueryData<TournamentMatchResult[]>(resultsKey())
      queryCache.setQueryData<TournamentMatchResult[]>(
        resultsKey(),
        (current) => {
          const others = (current ?? []).filter(result => result.pairingUuid !== pairingUuid)
          // This mutation is only ever the organizer's own direct entry (the
          // Telegram bot's own report writes server-side, not through here)
          // — reportedByPlayerUuid/confirmedAt/disputedAt are always null
          // for it.
          return [
            ...others,
            {
              pairingUuid,
              player1GamesWon,
              player2GamesWon,
              createdAt: new Date().toISOString(),
              reportedByPlayerUuid: null,
              confirmedAt: null,
              disputedAt: null
            }
          ]
        }
      )
      return { previous }
    },
    onError: (error, _payload, context) => {
      if (context?.previous) queryCache.setQueryData(resultsKey(), context.previous)
      toast.add({
        title: t('tournament.single.roundManager.matchResultErrorTitle'),
        description: toErrorMessage(error),
        color: 'error'
      })
    },
    onSettled: () => {
      queryCache.invalidateQueries({ key: resultsKey() })
      queryCache.invalidateQueries({ key: TOURNAMENT_PAIRINGS_KEY(toValue(tournamentUuid)) })
    }
  })

  const deleteMatchResult = useMutation({
    mutation: (pairingUuid: string) =>
      $fetch('/api/tournament-match-results/delete', {
        method: 'POST',
        body: { pairingUuid }
      }),
    onMutate(pairingUuid) {
      queryCache.cancelQueries({ key: resultsKey() })
      const previous = queryCache.getQueryData<TournamentMatchResult[]>(resultsKey())
      queryCache.setQueryData<TournamentMatchResult[]>(
        resultsKey(),
        current => (current ?? []).filter(result => result.pairingUuid !== pairingUuid)
      )
      return { previous }
    },
    onError: (error, _pairingUuid, context) => {
      if (context?.previous) queryCache.setQueryData(resultsKey(), context.previous)
      toast.add({
        title: t('tournament.single.roundManager.matchResultDeleteErrorTitle'),
        description: toErrorMessage(error),
        color: 'error'
      })
    },
    onSettled: () => {
      queryCache.invalidateQueries({ key: resultsKey() })
      queryCache.invalidateQueries({ key: TOURNAMENT_PAIRINGS_KEY(toValue(tournamentUuid)) })
    }
  })

  return { saveMatchResult, deleteMatchResult }
}
