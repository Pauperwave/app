// server\api\player-avoid-pairs\create.post.ts
// BFF: adds a globally-fixed avoid-pair. Resolves the two associate uuids to players.uuid and
// normalizes them to (min, max) order: the CHECK (player_a_uuid < player_b_uuid) allows one row per
// pair.
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

  const { data, error } = await supabase
    .from('player_avoid_pairs')
    .upsert(
      { player_a_uuid: playerAId, player_b_uuid: playerBId },
      { onConflict: 'player_a_uuid,player_b_uuid' }
    )
    .select()
    .single()

  if (error || !data) {
    throw createError({ statusCode: 500, statusMessage: error?.message ?? 'Avoid pair insert failed' })
  }

  return { avoidPair: data }
})
