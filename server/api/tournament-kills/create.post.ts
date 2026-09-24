// server\api\tournament-kills\create.post.ts
import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '#shared/utils/types/database'

interface CreateKillBody {
  tournamentUuid: string
  pairingUuid: string
  killerUuid: string
  killedPlayerUuid: string
}

export default defineEventHandler(async (event) => {
  await requireManagementPermission(event)

  const body = await readBody<CreateKillBody>(event)
  await recordKill(serverSupabaseServiceRole<Database>(event), body)

  return { success: true }
})
