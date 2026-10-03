// server\api\leagues\[id]\status.post.ts
interface SetLeagueStatusBody {
  status: string
}

// Partial update for the bulk "mark as" action (mirrors tournaments): update.post.ts requires the
// full NewLeaguePayload, which the bulk bar doesn't have per row.
export default defineEventHandler(async (event) => {
  const { id, body, supabase } = await parseIdMutationRequest<SetLeagueStatusBody>(event)
  const league = await updateStatusById(supabase, 'leagues', id, body.status)
  return { league }
})
