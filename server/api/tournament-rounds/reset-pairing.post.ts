// server\api\tournament-rounds\reset-pairing.post.ts
import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '#shared/utils/types/database'

interface ResetPairingBody {
  pairingUuid: string
}

// Clears one pairing's entered data (ranking, kills, votes) — migration
// 20260919000000. "Reset tavolo", ported from league (PairingsCard.vue).
export default defineEventHandler(async (event) => {
  await requireManagementPermission(event)

  const { pairingUuid } = await readBody<ResetPairingBody>(event)
  const supabase = serverSupabaseServiceRole<Database>(event)

  const { error } = await supabase.rpc('reset_commander_pairing', {
    p_pairing_uuid: pairingUuid
  })
  assertRoundRpcOk(error)

  return { success: true }
})
