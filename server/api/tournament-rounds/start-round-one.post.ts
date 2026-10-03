// server\api\tournament-rounds\start-round-one.post.ts
import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '#shared/utils/types/database'

interface StartRoundOneBody {
  tournamentUuid: string
  // Associate uuids in the seating order confirmed by TablePreviewModal.vue; the RPC
  // (start_commander_round_one) just slices it sequentially into pods
  associateOrder: string[]
  // Confirmed table sizes, in order — without them the RPC re-derives its own split and drops
  // dragged-in resizes.
  tableSizes: number[]
  // Seed of the shuffle the seating started from, kept so the preview can reopen on it after a
  // turn-back.
  shuffleSeed: number | null
}

// Delegates round-1 creation (pairings, zeroed standings, registration_open -> in_progress) to one
// RPC so it is a single Postgres transaction, like tournament-registrations/register.post.ts.
export default defineEventHandler(async (event) => {
  await requireManagementPermission(event)

  const {
    tournamentUuid, associateOrder, tableSizes, shuffleSeed
  } = await readBody<StartRoundOneBody>(event)
  const supabase = serverSupabaseServiceRole<Database>(event)

  const { data, error } = await supabase.rpc('start_commander_round_one', {
    p_tournament_uuid: tournamentUuid,
    p_associate_order: associateOrder,
    p_table_sizes: tableSizes,
    p_shuffle_seed: shuffleSeed ?? undefined
  })

  const roundUuid = unwrapRoundRpc(data, error)
  const notification = roundUuid === null ? null : await notifyRoundTables(roundUuid)

  return { roundUuid, notification }
})
