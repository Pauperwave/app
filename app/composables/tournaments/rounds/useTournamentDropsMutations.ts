// app\composables\tournaments\rounds\useTournamentDropsMutations.ts
export interface SetDropPayload {
  playerUuid: string
  roundUuid: string
  dropped: boolean
}

export function useTournamentDropsMutations(tournamentUuid: MaybeRefOrGetter<string>) {
  const queryCache = useQueryCache()
  const toast = useToast()
  const { t } = useI18n()
  const dropsKey = () => TOURNAMENT_DROPS_KEY(toValue(tournamentUuid))

  const setDropped = useMutation({
    mutation: (payload: SetDropPayload) =>
      $fetch('/api/tournament-drops/set', {
        method: 'POST',
        body: { tournamentUuid: toValue(tournamentUuid), ...payload }
      }),
    onMutate({ playerUuid, roundUuid, dropped }) {
      const previous = queryCache.getQueryData<TournamentDrop[]>(dropsKey())
      queryCache.setQueryData<TournamentDrop[]>(dropsKey(), (current) => {
        const others = (current ?? []).filter(drop => drop.playerUuid !== playerUuid)
        return dropped
          ? [...others, { playerUuid, roundUuid, droppedAt: new Date().toISOString() }]
          : others
      })
      return { previous }
    },
    onError: (error, _payload, context) => {
      if (context?.previous) queryCache.setQueryData(dropsKey(), context.previous)
      toast.add({
        title: t('tournament.single.roundManager.dropErrorTitle'),
        description: toErrorMessage(error),
        color: 'error'
      })
    },
    onSettled: () => queryCache.invalidateQueries({ key: dropsKey() })
  })

  return { setDropped }
}
