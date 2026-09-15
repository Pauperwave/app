// server\api\tournament-rounds\turn-back-round.post.ts
import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '#shared/utils/types/database'

interface TurnBackRoundBody {
  tournamentUuid: string
  currentRoundNumber: number
}

// Delegates round rollback to turn_back_commander_round (migration
// 20260916000000) — from round 2+, cascades wipe the closing round's
// pairings/results/kills/votes and reopen the previous round; from round 1,
// resets the tournament back to registration_open. Standings are left alone
// either way (the next advance-round recomputes them from scratch).
export default defineEventHandler(async (event) => {
  await requireManagementPermission(event)

  const { tournamentUuid, currentRoundNumber } = await readBody<TurnBackRoundBody>(event)
  const supabase = serverSupabaseServiceRole<Database>(event)

  const { error } = await supabase.rpc('turn_back_commander_round', {
    p_tournament_uuid: tournamentUuid,
    p_current_round_number: currentRoundNumber
  })

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }

  return { success: true }
})
