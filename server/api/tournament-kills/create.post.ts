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
  const supabase = serverSupabaseServiceRole<Database>(event)

  const { error } = await supabase.from('tournament_kills').insert({
    tournament_uuid: body.tournamentUuid,
    pairing_uuid: body.pairingUuid,
    killer_uuid: body.killerUuid,
    killed_player_uuid: body.killedPlayerUuid
  })

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }

  return { success: true }
})
