// server\api\tournament-rounds\turn-back-round-swiss.post.ts
import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '#shared/utils/types/database'

// fallow-ignore-next-line code-duplication -- turn-back handler mirrors the other format's handler
interface TurnBackRoundSwissBody {
  tournamentUuid: string
  currentRoundNumber: number
}

export default defineEventHandler(async (event) => {
  // 'cancel-round': cancelling a round (or the whole tournament back to registration) is admin+
  await requireAdminPermission(event)

  const { tournamentUuid, currentRoundNumber } = await readBody<TurnBackRoundSwissBody>(event)
  const supabase = serverSupabaseServiceRole<Database>(event)

  // Read before the RPC — it wipes the pairings the recipients come from.
  const cancelledMessages = await prepareTablesCancelledMessages(tournamentUuid, currentRoundNumber)

  const { error } = await supabase.rpc('turn_back_swiss_round', {
    p_tournament_uuid: tournamentUuid,
    p_current_round_number: currentRoundNumber
  })
  assertRoundRpcOk(error)

  await notifyTelegramAssociates(cancelledMessages)

  return { success: true }
})
