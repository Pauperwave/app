// server\api\events\[id]\update.post.ts
import type { NewEventPayload } from '#shared/types/events'

// Same convention as leagues/tournaments' own [id]/update.post.ts: events'
// RLS (management_full_access) already gates writes to management users,
// but every write still goes through a BFF endpoint rather than relying on
// RLS evaluated from the client.
export default defineEventHandler(async (event) => {
  const { id, body, supabase } = await parseIdMutationRequest<NewEventPayload>(event)

  const { data: updated, error } = await supabase
    .from('events')
    .update({
      name: body.name,
      status: body.status,
      location_uuid: body.locationUuid,
      organizer_uuid: body.organizerUuid,
      starts_at: body.startsAt,
      ends_at: body.endsAt,
      companion_app_code: body.companionCode,
      image_url: body.imageUrl,
      image_card_name: body.imageCardName,
      image_card_artist: body.imageCardArtist
    })
    .eq('id', id)
    .select()
    .single()

  if (error || !updated) {
    throw createError({
      statusCode: 500,
      statusMessage: error?.message ?? 'Event update failed'
    })
  }

  return { event: updated }
})
