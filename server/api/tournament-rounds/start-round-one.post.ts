// server\api\tournament-rounds\start-round-one.post.ts
import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '#shared/utils/types/database'

interface StartRoundOneBody {
  tournamentUuid: string
  // Associate uuids in the seating order confirmed by
  // TablePreviewModal.vue (ported league's pairing optimizer runs
  // client-side even at round 1, see that component's own comment) — this
  // endpoint just persists whatever final order it's given, sequentially
  // sliced into pods by start_commander_round_one (migration 20260915000001).
  associateOrder: string[]
}

// Delegates round-1 creation (pairings + zeroed standings + the
// tournament's registration_open -> in_progress flip) to a single RPC so
// the whole thing is one Postgres transaction — see the migration's own
// comment for why (same reasoning as tournament-registrations/register.post.ts).
export default defineEventHandler(async (event) => {
  await requireManagementPermission(event)

  const { tournamentUuid, associateOrder } = await readBody<StartRoundOneBody>(event)
  const supabase = serverSupabaseServiceRole<Database>(event)

  const { data, error } = await supabase.rpc('start_commander_round_one', {
    p_tournament_uuid: tournamentUuid,
    p_associate_order: associateOrder
  })

  return { roundUuid: unwrapRoundRpc(data, error) }
})
