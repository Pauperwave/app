// app\composables\tournaments\rounds\useTournamentMatchReportsQuery.ts
// Pinia Colada query for a 1v1 tournament's pending Telegram match reports
// (tournament_match_result_reports) — a player-submitted result still
// waiting for the opponent to confirm it, or disputed. One row per pairing
// (unique on pairing_uuid, migration 20260921000000); deleted once the real
// result is saved (see server/utils/tournaments/matchResults.ts), so a
// pairing only ever appears here while it's genuinely unresolved.
import type { ReportStatus } from '#shared/utils/tournaments/matchReport'

export interface TournamentMatchReport {
  pairingUuid: string
  reporterUuid: string
  status: ReportStatus
  player1GamesWon: number
  player2GamesWon: number
}

export const TOURNAMENT_MATCH_REPORTS_KEY = (tournamentUuid: string) =>
  ['tournament-match-reports', tournamentUuid]

export function useTournamentMatchReportsQuery(tournamentUuid: MaybeRefOrGetter<string>) {
  const supabase = useSupabaseClient()

  return useQuery({
    key: () => TOURNAMENT_MATCH_REPORTS_KEY(toValue(tournamentUuid)),
    query: async (): Promise<TournamentMatchReport[]> => {
      const { data, error } = await supabase
        .from('tournament_match_result_reports')
        .select('pairing_uuid, reporter_uuid, status, player1_games_won, player2_games_won')
        .eq('tournament_uuid', toValue(tournamentUuid))

      if (error) throw error

      return data.map(row => ({
        pairingUuid: row.pairing_uuid,
        reporterUuid: row.reporter_uuid,
        status: row.status as ReportStatus,
        player1GamesWon: row.player1_games_won,
        player2GamesWon: row.player2_games_won
      }))
    }
  })
}
