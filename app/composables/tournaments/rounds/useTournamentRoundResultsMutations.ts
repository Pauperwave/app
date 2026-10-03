// app\composables\tournaments\rounds\useTournamentRoundResultsMutations.ts
// Per-pairing placement entry, ported from league's upsertRoundResult flow (TableScoreGrid's
// "Confirm" -> savePairingRankings): one upsert per player per pairing, ON CONFLICT (pairing_uuid,
// player_uuid) DO UPDATE (uq_tournament_round_results_unique_player_per_pairing)
export interface RoundResultPayload {
  pairingUuid: string
  playerUuid: string
  position: number
}

export function useTournamentRoundResultsMutations(tournamentUuid: MaybeRefOrGetter<string>) {
  const queryCache = useQueryCache()
  const invalidate = () => {
    queryCache.invalidateQueries({ key: TOURNAMENT_ROUND_RESULTS_KEY(toValue(tournamentUuid)) })
    queryCache.invalidateQueries({ key: TOURNAMENT_PAIRINGS_KEY(toValue(tournamentUuid)) })
  }

  const saveRanking = useMutation({
    mutation: (results: RoundResultPayload[]) =>
      $fetch('/api/tournament-round-results/upsert', {
        method: 'POST',
        body: { tournamentUuid: toValue(tournamentUuid), results }
      }),
    onSettled: invalidate
  })

  return { saveRanking }
}
