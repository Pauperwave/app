// server\api\tournament-rounds\advance-round.post.ts
import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '#shared/utils/types/database'

interface AdvanceRoundBody {
  tournamentUuid: string
  currentRoundNumber: number
  // Required unless this is the last round: the confirmed seating order for the next round
  // (same TablePreviewModal.vue flow as round 1, see start-round-one.post.ts)
  associateOrder?: string[]
  // Confirmed table sizes for the next round, see start-round-one.post.ts
  tableSizes?: number[]
}

// Delegates the whole round-close/advance transition (recompute standings from scratch, close the
// round, create the next pairings or end the tournament) to advance_commander_round: one Postgres
// transaction.
export default defineEventHandler(async (event) => {
  await requireManagementPermission(event)

  const {
    tournamentUuid, currentRoundNumber, associateOrder, tableSizes
  } = await readBody<AdvanceRoundBody>(event)
  const supabase = serverSupabaseServiceRole<Database>(event)

  const { data, error } = await supabase.rpc('advance_commander_round', {
    p_tournament_uuid: tournamentUuid,
    p_current_round_number: currentRoundNumber,
    p_associate_order: associateOrder,
    p_table_sizes: tableSizes
  })
  const roundUuid = unwrapRoundRpc(data, error)

  // null roundUuid: the tournament just ended, no next round
  const notification = roundUuid === null ? null : await notifyRoundTables(roundUuid)

  return { roundUuid, hasEnded: roundUuid === null, notification }
})
