// server\api\tournament-rounds\start-round-one-swiss.post.ts
import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '#shared/utils/types/database'

interface StartRoundOneSwissBody {
  tournamentUuid: string
  // Associate uuids already paired up sequentially (seat 1 vs 2, 3 vs 4, ...)
  // by SwissTablePreviewModal.vue — this endpoint just persists whatever
  // final order it's given, same "client arranges, RPC seats" split as
  // start-round-one.post.ts (Commander).
  associateOrder: string[]
}

export default defineEventHandler(async (event) => {
  await requireManagementPermission(event)

  const { tournamentUuid, associateOrder } = await readBody<StartRoundOneSwissBody>(event)
  const supabase = serverSupabaseServiceRole<Database>(event)

  const { data, error } = await supabase.rpc('start_swiss_round_one', {
    p_tournament_uuid: tournamentUuid,
    p_associate_order: associateOrder
  })

  return { roundUuid: unwrapRoundRpc(data, error) }
})
