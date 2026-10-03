// server\api\tournament-kills\create.post.ts
import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '#shared/utils/types/database'

interface CreateKillBody {
  tournamentUuid: string
  pairingUuid: string
  killerUuid: string
  // fallow-ignore-next-line code-duplication -- same guard as the sibling handlers
  killedPlayerUuid: string
}

export default defineEventHandler(async (event) => {
  await requireManagementPermission(event)

  const body = await readBody<CreateKillBody>(event)
  const supabase = serverSupabaseServiceRole<Database>(event)
  await assertPairingEditable(supabase, body.pairingUuid)
  await recordKill(supabase, body)

  return { success: true }
})
