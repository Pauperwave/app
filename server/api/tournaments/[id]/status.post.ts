// server\api\tournaments\[id]\status.post.ts
interface SetTournamentStatusBody {
  status: string
}

// Dedicated partial-update endpoint (mirrors leagues' own
// [id]/status.post.ts) for the bulk "mark as" action — update.post.ts
// requires the full NewTournamentPayload shape, which the bulk-actions bar
// doesn't have per row.
export default defineEventHandler(async (event) => {
  const { id, body, supabase } = await parseIdMutationRequest<SetTournamentStatusBody>(event)
  const tournament = await updateStatusById(supabase, 'tournaments', id, body.status)
  return { tournament }
})
