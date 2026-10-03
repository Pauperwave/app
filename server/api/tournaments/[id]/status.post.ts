// server\api\tournaments\[id]\status.post.ts
interface SetTournamentStatusBody {
  status: string
}

// Partial update for the bulk "mark as" action (mirrors leagues): update.post.ts requires the full
// NewTournamentPayload, which the bulk bar doesn't have per row.
export default defineEventHandler(async (event) => {
  const { id, body, supabase } = await parseIdMutationRequest<SetTournamentStatusBody>(event)
  const tournament = await updateStatusById(supabase, 'tournaments', id, body.status)
  return { tournament }
})
