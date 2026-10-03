// server\api\tournaments\[id]\image.post.ts

interface SetTournamentImageBody {
  imageUrl: string | null
  imageCardName: string | null
  imageCardArtist: string | null
}

// Partial update for the bulk "set image" action (mirrors [id]/status.post.ts): update.post.ts
// requires the full NewTournamentPayload, which the bulk bar doesn't have per row.
export default defineEventHandler(async (event) => {
  const { id, body, supabase } = await parseIdMutationRequest<SetTournamentImageBody>(event)
  const tournament = await setImageById(supabase, 'tournaments', id, body, 'Tournament image update failed')

  return { tournament }
})
