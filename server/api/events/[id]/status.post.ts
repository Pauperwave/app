// server\api\events\[id]\status.post.ts
interface SetEventStatusBody {
  status: string
}

// Dedicated partial-update endpoint (mirrors leagues'/tournaments' own
// [id]/status.post.ts) for the bulk "mark as" action — update.post.ts
// requires the full NewEventPayload shape, which the bulk-actions bar
// doesn't have per row.
export default defineEventHandler(async (event) => {
  const { id, body, supabase } = await parseIdMutationRequest<SetEventStatusBody>(event)
  const updated = await updateStatusById(supabase, 'events', id, body.status)
  return { event: updated }
})
