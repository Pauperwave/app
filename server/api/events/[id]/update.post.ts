// server\api\events\[id]\update.post.ts
import type { NewEventPayload } from '#shared/types/events'

// Same convention as leagues/tournaments update.post.ts: RLS already gates writes to management,
// but every write goes through a BFF endpoint rather than RLS evaluated from the client.
export default defineEventHandler(async (event) => {
  const { id, body, supabase } = await parseIdMutationRequest<NewEventPayload>(event)

  const { data: updated, error } = await supabase
    .from('events')
    .update({
      name: body.name,
      status: body.status,
      location_uuid: body.locationUuid,
      organizer_uuid: body.organizerUuid,
      // starts_at/ends_at aren't editable: derived from the tournaments (derivedDates.ts).
      companion_app_code: body.companionCode,
      tagline: body.tagline,
      edition: body.edition,
      description: body.description,
      practical_notes: body.practicalNotes,
      tickets_url: body.ticketsUrl,
      tickets_on_sale_on: body.ticketsOnSaleOn,
      membership_required: body.membershipRequired,
      membership_url: body.membershipUrl,
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

  await replaceEventPartners(supabase, updated.uuid, body.partners)

  return { event: updated }
})
