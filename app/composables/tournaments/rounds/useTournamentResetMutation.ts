// app\composables\tournaments\rounds\useTournamentResetMutation.ts
// "Reset" button on the tournament detail navbar (user request,
// 2026-09-18) — wipes every round/pairing/result/standing for a
// tournament, format-agnostic (Commander and 1v1 Swiss both key off the
// same tables). Its own composable rather than folding into
// useTournamentRoundsMutations.ts/useTournamentSwissRoundsMutations.ts —
// this one isn't format-specific, unlike everything else in those two.
export function useTournamentResetMutation(tournamentUuid: MaybeRefOrGetter<string>) {
  const queryCache = useQueryCache()

  const resetTournament = useRoundLifecycleMutation<undefined>({
    endpoint: '/api/tournament-rounds/reset',
    errorTitleKey: 'tournament.single.resetErrorTitle',
    body: () => ({ tournamentUuid: toValue(tournamentUuid) }),
    onSettled: () => {
      queryCache.invalidateQueries({ key: TOURNAMENTS_KEY })
      queryCache.invalidateQueries({ key: TOURNAMENT_ROUNDS_KEY(toValue(tournamentUuid)) })
      queryCache.invalidateQueries({ key: TOURNAMENT_PAIRINGS_KEY(toValue(tournamentUuid)) })
      queryCache.invalidateQueries({ key: TOURNAMENT_STANDINGS_KEY(toValue(tournamentUuid)) })
    }
  })

  return { resetTournament }
}
