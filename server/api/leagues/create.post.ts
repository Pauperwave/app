// server\api\leagues\create.post.ts
import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '#shared/utils/types/database'
import type { NewLeaguePayload } from '#shared/types/leagues'

// RLS (management_full_access) already gates writes, but every write goes through a BFF endpoint
// (same as tournaments/events/transactions/wanted-cards).
// No starts_at/ends_at: they stay null until recomputeLeagueDates runs for the first tournament.
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
      image_url: body.imageUrl,
      image_card_name: body.imageCardName,
      image_card_artist: body.imageCardArtist
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
