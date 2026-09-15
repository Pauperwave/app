// server\api\tournament-rounds\turn-back-round-swiss.post.ts
import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '#shared/utils/types/database'

interface TurnBackRoundSwissBody {
  tournamentUuid: string
  currentRoundNumber: number
}

export default defineEventHandler(async (event) => {
  await requireManagementPermission(event)

  const { tournamentUuid, currentRoundNumber } = await readBody<TurnBackRoundSwissBody>(event)
  const supabase = serverSupabaseServiceRole<Database>(event)

  const { error } = await supabase.rpc('turn_back_swiss_round', {
    p_tournament_uuid: tournamentUuid,
    p_current_round_number: currentRoundNumber
  })

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }

  return { success: true }
})
