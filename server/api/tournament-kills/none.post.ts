// server\api\tournament-kills\none.post.ts
import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '#shared/utils/types/database'

interface SetNoKillsBody {
  pairingUuid: string
  noKills: boolean
}

// Confirms (or retracts) that a table ended without any kill.
export default defineEventHandler(async (event) => {
  await requireManagementPermission(event)

  const { pairingUuid, noKills } = await readBody<SetNoKillsBody>(event)
  await setPairingNoKills(serverSupabaseServiceRole<Database>(event), { pairingUuid, noKills })

  return { success: true }
})
