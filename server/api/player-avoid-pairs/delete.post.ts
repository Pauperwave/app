// server\api\player-avoid-pairs\delete.post.ts
// BFF: removes a globally-fixed avoid-pair. Resolves associate uuids and normalizes order like
// create.post.ts, since rows are stored with player_a_uuid < player_b_uuid.
import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '#shared/utils/types/database'

// fallow-ignore-next-line code-duplication -- avoid-pair handlers kept explicit per endpoint
interface AvoidPairBody {
  playerA: string
  playerB: string
}

export default defineEventHandler(async (event) => {
  await requireManagementPermission(event)

  const { playerA, playerB } = await readBody<AvoidPairBody>(event)
  const supabase = serverSupabaseServiceRole<Database>(event)

  const [playerAId, playerBId] = await resolveOrderedAvoidPairPlayers(supabase, playerA, playerB)

  const { error } = await supabase
    .from('player_avoid_pairs')
    .delete()
    .eq('player_a_uuid', playerAId)
    .eq('player_b_uuid', playerBId)

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }

  return { deleted: true }
})
