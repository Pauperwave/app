// server\api\player-avoid-pairs\create.post.ts
// BFF: add a globally-fixed avoid-pair — ported from
// MagicTheGathering/league's avoid-pairs/create.post.ts (user request,
// 2026-09-15). Resolves the two associate uuids (the client-side identity
// every pairing composable uses) to their players.uuid before writing,
// then normalizes into (min, max) order — the DB CHECK constraint
// (player_a_uuid < player_b_uuid) enforces exactly one canonical row per
// unordered pair.
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

  const { data: players, error: playersError } = await supabase
    .from('players')
    .select('uuid, associate_uuid')
    .in('associate_uuid', [playerA, playerB])

  if (playersError) {
    throw createError({ statusCode: 500, statusMessage: playersError.message })
  }

  const playerAUuid = players?.find(p => p.associate_uuid === playerA)?.uuid
  const playerBUuid = players?.find(p => p.associate_uuid === playerB)?.uuid

  if (!playerAUuid || !playerBUuid) {
    throw createError({ statusCode: 400, statusMessage: 'Both players must be registered' })
  }

  const [playerAId, playerBId] = playerAUuid < playerBUuid
    ? [playerAUuid, playerBUuid]
    : [playerBUuid, playerAUuid]

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
