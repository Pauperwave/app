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

// The pairing is marked completed right away, same rule as the Commander
// round-results upsert; a pending player report for it is dropped.
export default defineEventHandler(async (event) => {
  await requireManagementPermission(event)

  const body = await readBody<UpsertMatchResultBody>(event)
  await saveMatchResult(serverSupabaseServiceRole<Database>(event), body)

  return { success: true }
})
