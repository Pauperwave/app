// server\api\tournament-rounds\undraw-pairing.post.ts
import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '#shared/utils/types/database'

interface UndrawPairingBody {
  pairingUuid: string
}

// Undoes a "Patta" declaration: clears ranking + kills only, commander/vote data stay
export default defineEventHandler(async (event) => {
  await requireManagementPermission(event)

  const { pairingUuid } = await readBody<UndrawPairingBody>(event)
  const supabase = serverSupabaseServiceRole<Database>(event)
  await assertPairingEditable(supabase, pairingUuid)

  const { error } = await supabase.rpc('undraw_commander_pairing', {
    p_pairing_uuid: pairingUuid
  })
  assertRoundRpcOk(error)

  return { success: true }
})
