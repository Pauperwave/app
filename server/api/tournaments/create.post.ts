// server\api\tournaments\create.post.ts
import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '#shared/utils/types/database'
import type { NewTournamentPayload } from '#shared/types/tournaments'

// tournaments' RLS (management_full_access) already gates writes to
// management users, but every write still goes through a BFF endpoint — same
// convention as transactions/wanted-cards — rather than relying on RLS
// evaluated from the client.
export default defineEventHandler(async (event) => {
  await requireManagementPermission(event)
  const body = await readBody<NewTournamentPayload>(event)

  const supabase = serverSupabaseServiceRole<Database>(event)

  const { data: tournament, error } = await supabase
    .from('tournaments')
    .insert({
      name: body.name,
      status: body.status,
      format_uuid: body.formatUuid,
      location_uuid: body.locationUuid,
      organizer_uuid: body.organizerUuid,
      league_uuid: body.leagueUuid,
      event_uuid: body.eventUuid,
      starts_at: body.startsAt,
      ends_at: body.endsAt,
      round_count: body.roundCount,
      entry_fee: body.entryFee,
      description: body.description,
      prizes: body.prizes,
      companion_code: body.companionCode,
      image_url: body.imageUrl
    })
    .select()
    .single()

  if (error || !tournament) {
    throw createError({
      statusCode: 500,
      statusMessage: error?.message ?? 'Tournament creation failed'
    })
  }

  return { tournament }
})
