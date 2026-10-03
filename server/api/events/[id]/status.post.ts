// server\api\events\[id]\status.post.ts
interface SetEventStatusBody {
  status: string
}

// Partial update for the bulk "mark as" action (mirrors leagues/tournaments): update.post.ts
// requires the full NewEventPayload, which the bulk bar doesn't have per row.
export default defineEventHandler(async (event) => {
  const { id, body, supabase } = await parseIdMutationRequest<SetEventStatusBody>(event)
  const updated = await updateStatusById(supabase, 'events', id, body.status)
  return { event: updated }
})
