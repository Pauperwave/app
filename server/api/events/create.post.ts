// server\api\events\create.post.ts
import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '#shared/utils/types/database'
import type { NewEventPayload } from '#shared/types/events'

// events' RLS (management_full_access) already gates writes to management
// users, but every write still goes through a BFF endpoint — same convention
// as tournaments/transactions/wanted-cards — rather than relying on RLS
// evaluated from the client.
export default defineEventHandler(async (event) => {
  await requireManagementPermission(event)
  const body = await readBody<NewEventPayload>(event)

  const supabase = serverSupabaseServiceRole<Database>(event)

  const { data: newEvent, error } = await supabase
    .from('events')
    .insert({
      name: body.name,
      status: body.status,
      location_uuid: body.locationUuid,
      organizer_uuid: body.organizerUuid,
      // starts_at/ends_at stay null until a tournament joins the event (derivedDates.ts).
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
    .select()
    .single()

  if (error || !newEvent) {
    throw createError({
      statusCode: 500,
      statusMessage: error?.message ?? 'Event creation failed'
    })
  }

  await replaceEventPartners(supabase, newEvent.uuid, body.partners)

  return { event: newEvent }
})
