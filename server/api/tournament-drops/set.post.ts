// server\api\tournament-drops\set.post.ts
import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '#shared/utils/types/database'

interface SetDropBody {
  tournamentUuid: string
  playerUuid: string
  roundUuid: string
  dropped: boolean
}

// Records (or undoes) a player's drop. dropped_at is stamped by the database.
export default defineEventHandler(async (event) => {
  await requireManagementPermission(event)

  const {
    tournamentUuid, playerUuid, roundUuid, dropped
  } = await readBody<SetDropBody>(event)
  const supabase = serverSupabaseServiceRole<Database>(event)

  await setPlayerDropped(supabase, {
    tournamentUuid, playerUuid, roundUuid, dropped
  })

  return { success: true }
})
