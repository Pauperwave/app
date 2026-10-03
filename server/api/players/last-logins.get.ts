// server\api\players\last-logins.get.ts
import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '#shared/utils/types/database'
import type { PlayerLastLogin } from '#shared/types/players'

// Deliberate, narrow exception to the "never call the Supabase admin API for auth data" convention
// (ADR-008, docs/architecture/database.md): that is about display names, which
// pauperwave_associates substitutes. last_sign_in_at exists only in auth.users, unreachable via
// PostgREST/RLS. Paginated listUsers() avoids one admin-API call per player; cheap at this club's
// scale.
const PAGE_SIZE = 200

export default defineEventHandler(async (event): Promise<PlayerLastLogin[]> => {
  await requireManagementPermission(event)

  const supabase = serverSupabaseServiceRole<Database>(event)

  const { data: players, error: playersError } = await supabase
    .from('players')
    .select('uuid, user_id')
    .not('user_id', 'is', null)

  if (playersError) {
    throw createError({ statusCode: 500, statusMessage: playersError.message })
  }

  const lastSignInByUserId = new Map<string, string | null>()
  let page = 1

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: PAGE_SIZE })
    if (error) {
      throw createError({ statusCode: 500, statusMessage: error.message })
    }

    for (const user of data.users) {
      lastSignInByUserId.set(user.id, user.last_sign_in_at ?? null)
    }

    if (data.users.length < PAGE_SIZE) break
    page++
  }

  return players.map(player => ({
    playerUuid: player.uuid,
    lastSignInAt: player.user_id ? lastSignInByUserId.get(player.user_id) ?? null : null
  }))
})
