// server\api\tournament-rounds\start-round-one-swiss.post.ts
import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '#shared/utils/types/database'

interface StartRoundOneSwissBody {
  tournamentUuid: string
  // Associate uuids already paired sequentially (seat 1 vs 2, 3 vs 4, ...) by
  // SwissTablePreviewModal.vue; the client arranges, the RPC seats (as in start-round-one.post.ts)
  associateOrder: string[]
  // Seed of the shuffle the seating started from, kept so the preview can reopen on it after a
  // turn-back.
  shuffleSeed: number | null
}

export default defineEventHandler(async (event) => {
  await requireManagementPermission(event)

  const {
    tournamentUuid, associateOrder, shuffleSeed
  } = await readBody<StartRoundOneSwissBody>(event)
  const supabase = serverSupabaseServiceRole<Database>(event)

  const { data, error } = await supabase.rpc('start_swiss_round_one', {
    p_tournament_uuid: tournamentUuid,
    p_associate_order: associateOrder,
    p_shuffle_seed: shuffleSeed ?? undefined
  })

  const roundUuid = unwrapRoundRpc(data, error)
  const notification = roundUuid === null ? null : await notifyRoundTables(roundUuid)

  return { roundUuid, notification }
})
