// server\utils\tournaments\matchResults.ts
// Writing a 1v1 result: shared by the organizer's endpoint and the Telegram
// bot's own report (which now writes immediately, same as an organizer's
// entry — user request, 2026-09-24). confirmMatchResult/disputeMatchResult
// are the opponent's answer to a Telegram-reported score; a dispute flags
// the already-saved result for organizer review, it doesn't revert it.
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '#shared/utils/types/database'

export interface MatchResultInput {
  tournamentUuid: string
  pairingUuid: string
  player1Uuid: string
  player2Uuid: string
  player1GamesWon: number
  player2GamesWon: number
  // Set only when this result came from a player's own Telegram report —
  // null/omitted for one an organizer entered directly, so the UI can tell
  // the two apart (user request, 2026-09-23).
  reportedByPlayerUuid?: string | null
}

// Invalid best-of-3 scores are rejected by ck_tournament_match_results_score.
// Always resets confirmed_at/disputed_at to null: any write here — a fresh
// Telegram report or an organizer overwriting a prior score — is a new
// score that hasn't been answered yet.
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
