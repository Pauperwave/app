// app\composables\tournaments\rounds\useInvalidateRoundData.ts

// Every round-lifecycle write touches rounds/pairings/results: invalidate all of it rather than
// tracking exactly which query each mutation happens to touch. `resultsKey` is the format's own
// results query (Commander standings, Swiss match results).
export function useInvalidateRoundData(
  tournamentUuid: MaybeRefOrGetter<string>,
  resultsKey: (tournamentUuid: string) => ReturnType<typeof TOURNAMENT_PAIRINGS_KEY>
) {
  const queryCache = useQueryCache()

  return () => {
    queryCache.invalidateQueries({ key: TOURNAMENTS_KEY })
    queryCache.invalidateQueries({ key: TOURNAMENT_ROUNDS_KEY(toValue(tournamentUuid)) })
    queryCache.invalidateQueries({ key: TOURNAMENT_PAIRINGS_KEY(toValue(tournamentUuid)) })
    queryCache.invalidateQueries({ key: resultsKey(toValue(tournamentUuid)) })
  }
}
