// server\api\events\[id]\image.post.ts

interface SetEventImageBody {
  imageUrl: string | null
  imageCardName: string | null
  imageCardArtist: string | null
}

// Partial update for the "set image" quick action (mirrors tournaments/[id]/image.post.ts):
// update.post.ts requires the full NewEventPayload.
export default defineEventHandler(async (event) => {
  const { id, body, supabase } = await parseIdMutationRequest<SetEventImageBody>(event)
  const eventRow = await setImageById(supabase, 'events', id, body, 'Event image update failed')

  return { event: eventRow }
})
