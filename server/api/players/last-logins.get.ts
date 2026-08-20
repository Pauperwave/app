// server\api\players\last-logins.get.ts
import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '#shared/utils/types/database'
import type { PlayerLastLogin } from '#shared/types/players'

// This is a deliberate, narrow exception to the "never call the Supabase
// admin API to resolve auth data" convention (docs/PROGRESS.md ADR-008,
// docs/architecture/database.md's own migration notes) — that convention is
// about resolving *display names* via auth.users, which pauperwave_associates
// already has a substitute for (the created_by/updated_by FK retarget those
// docs describe). last_sign_in_at has no equivalent anywhere in the public
// schema; auth.users is genuinely the only source of truth for it.
//
// listUsers() (paginated, not getUserById() per player) avoids N admin-API
// round trips for N players — cheap at this club's scale (a few hundred
// auth users at most), and the whole point of a BFF endpoint over a direct
// client query anyway: auth.users isn't reachable via PostgREST/RLS at all.
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
