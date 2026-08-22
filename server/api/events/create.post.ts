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
      starts_at: body.startsAt,
      ends_at: body.endsAt,
      companion_app_code: body.companionCode,
      image_url: body.imageUrl
    })
    .select()
    .single()

  if (error || !newEvent) {
    throw createError({
      statusCode: 500,
      statusMessage: error?.message ?? 'Event creation failed'
    })
  }

  return { event: newEvent }
})
