// server\utils\playerAvoidPairs.ts
// Resolves two associates (the client-side identity every pairing
// composable uses) to their players.uuid, then normalizes into (min, max)
// order — the DB CHECK constraint (player_a_uuid < player_b_uuid) enforces
// exactly one canonical row per unordered pair. Shared by
// player-avoid-pairs/create.post.ts and .../delete.post.ts, which
// independently duplicated this exact resolution (fallow:dupes, 2026-09-23).
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '#shared/utils/types/database'

export async function resolveOrderedAvoidPairPlayers(
  supabase: SupabaseClient<Database>, associateA: string, associateB: string
): Promise<[string, string]> {
  const { data: players, error } = await supabase
    .from('players')
    .select('uuid, associate_uuid')
    .in('associate_uuid', [associateA, associateB])

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }

  const playerAUuid = players?.find(p => p.associate_uuid === associateA)?.uuid
  const playerBUuid = players?.find(p => p.associate_uuid === associateB)?.uuid

  if (!playerAUuid || !playerBUuid) {
    throw createError({ statusCode: 400, statusMessage: 'Both players must be registered' })
  }

  return playerAUuid < playerBUuid ? [playerAUuid, playerBUuid] : [playerBUuid, playerAUuid]
}
