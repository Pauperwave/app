// server\api\locations\create.post.ts
import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '#shared/utils/types/database'
import type { NewLocationPayload } from '#shared/types/locations'

// Same convention as tournaments/create.post.ts: every write goes through a
// BFF endpoint (requireManagementPermission is the authorization boundary),
// not RLS evaluated from the client.
export default defineEventHandler(async (event) => {
  await requireManagementPermission(event)
  const body = await readBody<NewLocationPayload>(event)

  const supabase = serverSupabaseServiceRole<Database>(event)

  const { data: location, error } = await supabase
    .from('locations')
    .insert({
      name: body.name,
      address: body.address,
      city: body.city,
      province: body.province,
      postal_code: body.postalCode,
      country: body.country,
      phone: body.phone,
      email: body.email,
      website: body.website,
      google_maps_url: body.googleMapsUrl,
      opening_hours: body.openingHours,
      image_url: body.image,
      facebook_url: body.facebook,
      instagram_url: body.instagram,
      telegram_url: body.telegramChannel,
      whatsapp_url: body.whatsapp,
      temporarily_closed: body.temporarilyClosed
    })
    .select()
    .single()

  if (error || !location) {
    throw createError({
      statusCode: 500,
      statusMessage: error?.message ?? 'Location creation failed'
    })
  }

  return { location }
})
