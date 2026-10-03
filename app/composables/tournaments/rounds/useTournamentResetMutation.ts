// app\composables\tournaments\rounds\useTournamentResetMutation.ts
// "Reset" button on the tournament detail navbar: wipes every round/pairing/result/standing,
// format-agnostic (Commander and 1v1 Swiss use the same tables). Its own composable rather than
// part of useTournamentRoundsMutations.ts/useTournamentSwissRoundsMutations.ts, as it isn't
// format-specific
export function useTournamentResetMutation(tournamentUuid: MaybeRefOrGetter<string>) {
  const resetTournament = useRoundLifecycleMutation<undefined>({
    endpoint: '/api/tournament-rounds/reset',
    errorTitleKey: 'tournament.single.resetErrorTitle',
    body: () => ({ tournamentUuid: toValue(tournamentUuid) }),
    onSettled: useInvalidateRoundData(tournamentUuid, TOURNAMENT_STANDINGS_KEY)
  })

  return { resetTournament }
}
