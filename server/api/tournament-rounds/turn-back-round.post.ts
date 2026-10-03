// server\api\tournament-rounds\turn-back-round.post.ts
import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '#shared/utils/types/database'

// fallow-ignore-next-line code-duplication -- turn-back handler mirrors the other format's handler
interface TurnBackRoundBody {
  tournamentUuid: string
  currentRoundNumber: number
}

// Delegates round rollback to turn_back_commander_round: from round 2+, wipes the closing round's
// pairings/results/kills/votes and reopens the previous one; from round 1, resets to
// registration_open. Standings are left alone (the next advance-round recomputes them).
export default defineEventHandler(async (event) => {
  await requireManagementPermission(event)

  const { tournamentUuid, currentRoundNumber } = await readBody<TurnBackRoundBody>(event)
  const supabase = serverSupabaseServiceRole<Database>(event)

  // Read before the RPC — it wipes the pairings the recipients come from.
  const cancelledMessages = await prepareTablesCancelledMessages(tournamentUuid, currentRoundNumber)

  const { error } = await supabase.rpc('turn_back_commander_round', {
    p_tournament_uuid: tournamentUuid,
    p_current_round_number: currentRoundNumber
  })
  assertRoundRpcOk(error)

  await notifyTelegramAssociates(cancelledMessages)

  return { success: true }
})
