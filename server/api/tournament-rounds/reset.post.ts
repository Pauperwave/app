// server\api\tournament-rounds\reset.post.ts
import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '#shared/utils/types/database'

interface ResetTournamentBody {
  tournamentUuid: string
}

// Wipes every round/pairing/result/standing and resets the tournament to registration_open
// (format-agnostic: same RPC for Commander and 1v1 Swiss).
export default defineEventHandler(async (event) => {
  // 'cancel-round': cancelling a round (or the whole tournament back to registration) is admin+
  await requireAdminPermission(event)

  const { tournamentUuid } = await readBody<ResetTournamentBody>(event)
  const supabase = serverSupabaseServiceRole<Database>(event)

  // Read before the RPC — it wipes the pairings the recipients come from.
  const cancelledMessages = await prepareTablesCancelledMessages(tournamentUuid)

  const { error } = await supabase.rpc('reset_tournament', {
    p_tournament_uuid: tournamentUuid
  })

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }

  await notifyTelegramAssociates(cancelledMessages)

  return { success: true }
})
