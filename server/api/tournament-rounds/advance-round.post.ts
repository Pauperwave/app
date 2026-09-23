// server\api\tournament-rounds\advance-round.post.ts
import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '#shared/utils/types/database'

interface AdvanceRoundBody {
  tournamentUuid: string
  currentRoundNumber: number
  // Required unless this is the last round — the confirmed seating order
  // for the next round, same TablePreviewModal.vue optimizer flow as round 1
  // (see start-round-one.post.ts's own comment).
  associateOrder?: string[]
}

// Delegates the whole round-close/advance transition (recompute standings
// from scratch through currentRoundNumber, close the round, create the next
// round's pairings or end the tournament) to advance_commander_round
// (migration 20260916000000) — one Postgres transaction, not a sequence of
// Supabase JS calls (league's own advance-round.post.ts isn't atomic here).
export default defineEventHandler(async (event) => {
  await requireManagementPermission(event)

  const { tournamentUuid, currentRoundNumber, associateOrder }
    = await readBody<AdvanceRoundBody>(event)
  const supabase = serverSupabaseServiceRole<Database>(event)

  const { data, error } = await supabase.rpc('advance_commander_round', {
    p_tournament_uuid: tournamentUuid,
    p_current_round_number: currentRoundNumber,
    p_associate_order: associateOrder
  })
  const roundUuid = unwrapRoundRpc(data, error)

  // null roundUuid means the tournament just ended (no next round created).
  return { roundUuid, hasEnded: roundUuid === null }
})
