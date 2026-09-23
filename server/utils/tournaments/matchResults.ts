// server\utils\tournaments\matchResults.ts
// Writing a 1v1 result, shared by the organizer's endpoint and the Telegram
// bot's confirmation: the score, the pairing marked completed, and the
// pending report (if any) removed since the real result replaces it.
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '#shared/utils/types/database'

export interface MatchResultInput {
  tournamentUuid: string
  pairingUuid: string
  player1Uuid: string
  player2Uuid: string
  player1GamesWon: number
  player2GamesWon: number
  // Set only when this result came from a player's Telegram report the
  // opponent confirmed — null/omitted for one an organizer entered directly,
  // so the UI can tell the two apart (user request, 2026-09-23).
  reportedByPlayerUuid?: string | null
}

// Invalid best-of-3 scores are rejected by ck_tournament_match_results_score.
export async function saveMatchResult(supabase: SupabaseClient<Database>, input: MatchResultInput) {
  const { error: resultError } = await supabase
    .from('tournament_match_results')
    .upsert({
      tournament_uuid: input.tournamentUuid,
      pairing_uuid: input.pairingUuid,
      player1_uuid: input.player1Uuid,
      player2_uuid: input.player2Uuid,
      player1_games_won: input.player1GamesWon,
      player2_games_won: input.player2GamesWon,
      reported_by_player_uuid: input.reportedByPlayerUuid ?? null
    }, { onConflict: 'pairing_uuid' })

  if (resultError) {
    throw createError({ statusCode: 500, statusMessage: resultError.message })
  }

  const { error: statusError } = await supabase
    .from('tournament_pairings')
    .update({ status: 'completed' })
    .eq('uuid', input.pairingUuid)

  if (statusError) {
    throw createError({ statusCode: 500, statusMessage: statusError.message })
  }

  const { error: reportError } = await supabase
    .from('tournament_match_result_reports')
    .delete()
    .eq('pairing_uuid', input.pairingUuid)

  if (reportError) {
    throw createError({ statusCode: 500, statusMessage: reportError.message })
  }
}
