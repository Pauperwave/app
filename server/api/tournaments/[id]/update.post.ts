// server\api\tournaments\[id]\update.post.ts
import type { NewTournamentPayload } from '#shared/types/tournaments'

// Same convention as create.post.ts: tournaments' RLS (management_full_access)
// already gates writes to management users, but every write still goes
// through a BFF endpoint rather than relying on RLS evaluated from the client.
export default defineEventHandler(async (event) => {
  const { id, body, supabase } = await parseIdMutationRequest<NewTournamentPayload>(event)

  const { data: tournament, error } = await supabase
    .from('tournaments')
    .update({
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
      companion_code: body.companionCode
    })
    .eq('id', id)
    .select()
    .single()

  if (error || !tournament) {
    throw createError({
      statusCode: 500,
      statusMessage: error?.message ?? 'Tournament update failed'
    })
  }

  return { tournament }
})
