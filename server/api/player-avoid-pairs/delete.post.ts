// server\api\player-avoid-pairs\delete.post.ts
// BFF: remove a globally-fixed avoid-pair — ported from
// MagicTheGathering/league's avoid-pairs/delete.post.ts (user request,
// 2026-09-15). Resolves associate uuids to players.uuid and normalizes
// order the same way create.post.ts does, since the DB row is always
// stored with player_a_uuid < player_b_uuid.
import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '#shared/utils/types/database'

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
