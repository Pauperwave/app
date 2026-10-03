// server\utils\tournaments\matchResults.ts
// Writing a 1v1 result: shared by the organizer's endpoint and the Telegram bot's report (written
// at once, like an organizer's entry). confirmMatchResult/disputeMatchResult are the opponent's
// answer to a Telegram-reported score; a dispute flags the saved result for organizer review
// without reverting it.
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '#shared/utils/types/database'

export interface MatchResultInput {
  tournamentUuid: string
  pairingUuid: string
  player1Uuid: string
  player2Uuid: string
  player1GamesWon: number
  player2GamesWon: number
  // Set only for a result from a player's own Telegram report (null/omitted when an organizer
  // entered it), so the UI can tell them apart
  reportedByPlayerUuid?: string | null
}

// Invalid best-of-3 scores are rejected by ck_tournament_match_results_score. Always resets
// confirmed_at/disputed_at: any write here is a new score nobody has answered yet.
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
      reported_by_player_uuid: input.reportedByPlayerUuid ?? null,
      confirmed_at: null,
      disputed_at: null
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
}

export async function confirmMatchResult(supabase: SupabaseClient<Database>, pairingUuid: string) {
  const { error } = await supabase
    .from('tournament_match_results')
    .update({ confirmed_at: new Date().toISOString() })
    .eq('pairing_uuid', pairingUuid)
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
}

export async function disputeMatchResult(supabase: SupabaseClient<Database>, pairingUuid: string) {
  const { error } = await supabase
    .from('tournament_match_results')
    .update({ disputed_at: new Date().toISOString() })
    .eq('pairing_uuid', pairingUuid)
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
}
