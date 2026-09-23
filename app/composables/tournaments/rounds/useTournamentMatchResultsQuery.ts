// app\composables\tournaments\rounds\useTournamentMatchResultsQuery.ts
// Pinia Colada query for a 1v1 tournament's best-of-3 match results, across
// every round — same "tournament-wide, filter client-side" convention as
// useTournamentPairingsQuery.ts.
export interface TournamentMatchResult {
  pairingUuid: string
  player1GamesWon: number
  player2GamesWon: number
  createdAt: string
  // Set when this result came from a player's own Telegram report — null for
  // one an organizer entered directly (migration 20260923140000, user
  // request 2026-09-23). confirmedAt/disputedAt are the opponent's answer to
  // that report, both null until they respond (migration 20260924100000,
  // user request 2026-09-24) — the score itself is never reverted by either.
  reportedByPlayerUuid: string | null
  confirmedAt: string | null
  disputedAt: string | null
}

export const TOURNAMENT_MATCH_RESULTS_KEY = (tournamentUuid: string) =>
  ['tournament-match-results', tournamentUuid]

export function useTournamentMatchResultsQuery(tournamentUuid: MaybeRefOrGetter<string>) {
  const supabase = useSupabaseClient()

  return useQuery({
    key: () => TOURNAMENT_MATCH_RESULTS_KEY(toValue(tournamentUuid)),
    query: async (): Promise<TournamentMatchResult[]> => {
      const data = await fetchAllRows((from, to) => supabase
        .from('tournament_match_results')
        .select(`
          pairing_uuid, player1_games_won, player2_games_won, created_at,
          reported_by_player_uuid, confirmed_at, disputed_at
        `)
        .eq('tournament_uuid', toValue(tournamentUuid))
        .order('id')
        .range(from, to))

      return data.map(row => ({
        pairingUuid: row.pairing_uuid,
        player1GamesWon: row.player1_games_won,
        player2GamesWon: row.player2_games_won,
        createdAt: row.created_at,
        reportedByPlayerUuid: row.reported_by_player_uuid,
        confirmedAt: row.confirmed_at,
        disputedAt: row.disputed_at
      }))
    }
  })
}
