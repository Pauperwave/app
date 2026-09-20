// app\composables\tournaments\rounds\useTournamentMatchResultsQuery.ts
// Pinia Colada query for a 1v1 tournament's best-of-3 match results, across
// every round — same "tournament-wide, filter client-side" convention as
// useTournamentPairingsQuery.ts.
export interface TournamentMatchResult {
  pairingUuid: string
  player1GamesWon: number
  player2GamesWon: number
}

export const TOURNAMENT_MATCH_RESULTS_KEY = (tournamentUuid: string) =>
  ['tournament-match-results', tournamentUuid]

export function useTournamentMatchResultsQuery(tournamentUuid: MaybeRefOrGetter<string>) {
  const supabase = useSupabaseClient()

  return useQuery({
    key: () => TOURNAMENT_MATCH_RESULTS_KEY(toValue(tournamentUuid)),
    query: async (): Promise<TournamentMatchResult[]> => {
      const { data, error } = await supabase
        .from('tournament_match_results')
        .select('pairing_uuid, player1_games_won, player2_games_won')
        .eq('tournament_uuid', toValue(tournamentUuid))

      if (error) throw error

      return (data ?? []).map(row => ({
        pairingUuid: row.pairing_uuid,
        player1GamesWon: row.player1_games_won,
        player2GamesWon: row.player2_games_won
      }))
    }
  })
}
