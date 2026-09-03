// server\api\events\[id]\image.post.ts

interface SetEventImageBody {
  imageUrl: string | null
  imageCardName: string | null
  imageCardArtist: string | null
}

// Dedicated partial-update endpoint (mirrors tournaments/[id]/image.post.ts)
// for the single-event "set image" quick action — update.post.ts requires
// the full NewEventPayload shape.
export default defineEventHandler(async (event) => {
  const { id, body, supabase } = await parseIdMutationRequest<SetEventImageBody>(event)
  const eventRow = await setImageById(supabase, 'events', id, body, 'Event image update failed')

  return { event: eventRow }
})
