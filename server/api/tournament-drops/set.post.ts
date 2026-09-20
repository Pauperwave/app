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

  const { error } = dropped
    ? await supabase
      .from('tournament_player_drops')
      .upsert({
        tournament_uuid: tournamentUuid,
        player_uuid: playerUuid,
        round_uuid: roundUuid
      }, { onConflict: 'tournament_uuid,player_uuid', ignoreDuplicates: true })
    : await supabase
      .from('tournament_player_drops')
      .delete()
      .eq('tournament_uuid', tournamentUuid)
      .eq('player_uuid', playerUuid)

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }

  return { success: true }
})
