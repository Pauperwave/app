// server\api\events\[id]\image.post.ts
import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '#shared/utils/types/database'

interface SetEventImageBody {
  imageUrl: string | null
  imageCardName: string | null
  imageCardArtist: string | null
}

// Dedicated partial-update endpoint (mirrors tournaments/[id]/image.post.ts)
// for the single-event "set image" quick action — update.post.ts requires
// the full NewEventPayload shape.
export default defineEventHandler(async (event) => {
  await requireManagementPermission(event)

  const id = Number(getRouterParam(event, 'id'))
  const { imageUrl, imageCardName, imageCardArtist } = await readBody<SetEventImageBody>(event)

  const supabase = serverSupabaseServiceRole<Database>(event)

  const { data: eventRow, error } = await supabase
    .from('events')
    .update({
      image_url: imageUrl, image_card_name: imageCardName, image_card_artist: imageCardArtist
    })
    .eq('id', id)
    .select()
    .single()

  if (error || !eventRow) {
    throw createError({
      statusCode: 500,
      statusMessage: error?.message ?? 'Event image update failed'
    })
  }

  return { event: eventRow }
})
