// server\api\tournament-match-results\upsert.post.ts
import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '#shared/utils/types/database'

interface UpsertMatchResultBody {
  tournamentUuid: string
  pairingUuid: string
  player1Uuid: string
  player2Uuid: string
  player1GamesWon: number
  player2GamesWon: number
}

// Invalid best-of-3 scores are rejected by ck_tournament_match_results_score.
// The pairing is marked completed right away, same rule as the Commander
// round-results upsert.
export default defineEventHandler(async (event) => {
  await requireManagementPermission(event)

  const {
    tournamentUuid, pairingUuid, player1Uuid, player2Uuid, player1GamesWon, player2GamesWon
  } = await readBody<UpsertMatchResultBody>(event)
  const supabase = serverSupabaseServiceRole<Database>(event)

  const { error: resultError } = await supabase
    .from('tournament_match_results')
    .upsert({
      tournament_uuid: tournamentUuid,
      pairing_uuid: pairingUuid,
      player1_uuid: player1Uuid,
      player2_uuid: player2Uuid,
      player1_games_won: player1GamesWon,
      player2_games_won: player2GamesWon
    }, { onConflict: 'pairing_uuid' })

  if (resultError) {
    throw createError({ statusCode: 500, statusMessage: resultError.message })
  }

  const { error: statusError } = await supabase
    .from('tournament_pairings')
    .update({ status: 'completed' })
    .eq('uuid', pairingUuid)

  if (statusError) {
    throw createError({ statusCode: 500, statusMessage: statusError.message })
  }

  return { success: true }
})
