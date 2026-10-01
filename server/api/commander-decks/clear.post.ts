// server\api\commander-decks\clear.post.ts
import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '#shared/utils/types/database'

interface ClearCommanderBody {
  pairingUuid: string
  playerUuid: string
}

export default defineEventHandler(async (event) => {
  await requireManagementPermission(event)

  const { pairingUuid, playerUuid } = await readBody<ClearCommanderBody>(event)
  const supabase = serverSupabaseServiceRole<Database>(event)

  await clearCommanderDeck(supabase, { pairingUuid, playerUuid })

  return { success: true }
})
