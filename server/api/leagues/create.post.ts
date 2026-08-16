// server\api\leagues\create.post.ts
import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '#shared/utils/types/database'
import type { NewLeaguePayload } from '#shared/types/leagues'

// leagues' RLS (management_full_access) already gates writes to management
// users, but every write still goes through a BFF endpoint — same convention
// as tournaments/events/transactions/wanted-cards.
export default defineEventHandler(async (event) => {
  await requireManagementPermission(event)
  const body = await readBody<NewLeaguePayload>(event)

  const supabase = serverSupabaseServiceRole<Database>(event)

  const { data: league, error } = await supabase
    .from('leagues')
    .insert({
      name: body.name,
      status: body.status,
      ruleset_uuid: body.rulesetUuid,
      starts_at: body.startsAt,
      ends_at: body.endsAt
    })
    .select()
    .single()

  if (error || !league) {
    throw createError({
      statusCode: 500,
      statusMessage: error?.message ?? 'League creation failed'
    })
  }

  return { league }
})
