// server\api\leagues\[id]\status.post.ts
interface SetLeagueStatusBody {
  status: string
}

// Dedicated partial-update endpoint (mirrors tournaments' own
// [id]/status.post.ts) for the bulk "mark as" action — update.post.ts
// requires the full NewLeaguePayload shape, which the bulk-actions bar
// doesn't have per row.
export default defineEventHandler(async (event) => {
  const { id, body, supabase } = await parseIdMutationRequest<SetLeagueStatusBody>(event)
  const league = await updateStatusById(supabase, 'leagues', id, body.status)
  return { league }
})
