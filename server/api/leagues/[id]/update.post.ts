// server\api\leagues\[id]\update.post.ts
import type { NewLeaguePayload } from '#shared/types/leagues'

// Same convention as tournaments/[id]/update.post.ts: leagues' RLS
// (management_full_access) already gates writes to management users, but
// every write still goes through a BFF endpoint rather than relying on RLS
// evaluated from the client.
export default defineEventHandler(async (event) => {
  const { id, body, supabase } = await parseIdMutationRequest<NewLeaguePayload>(event)

  const { data: league, error } = await supabase
    .from('leagues')
    .update({
      name: body.name,
      status: body.status,
      ruleset_uuid: body.rulesetUuid,
      starts_at: body.startsAt,
      ends_at: body.endsAt
    })
    .eq('id', id)
    .select()
    .single()

  if (error || !league) {
    throw createError({
      statusCode: 500,
      statusMessage: error?.message ?? 'League update failed'
    })
  }

  return { league }
})
