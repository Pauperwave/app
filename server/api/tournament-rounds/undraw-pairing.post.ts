// server\api\tournament-rounds\undraw-pairing.post.ts
import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '#shared/utils/types/database'

interface UndrawPairingBody {
  pairingUuid: string
}

// Undoes a "Patta" declaration — clears ranking + kills only, leaving
// commander/vote data untouched (migration 20260919010000). Ported from
// league's tournamentStore.undrawPairing.
export default defineEventHandler(async (event) => {
  await requireManagementPermission(event)

  const { pairingUuid } = await readBody<UndrawPairingBody>(event)
  const supabase = serverSupabaseServiceRole<Database>(event)

  const { error } = await supabase.rpc('undraw_commander_pairing', {
    p_pairing_uuid: pairingUuid
  })

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }

  return { success: true }
})
