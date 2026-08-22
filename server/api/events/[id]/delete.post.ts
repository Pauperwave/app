// server\api\events\[id]\delete.post.ts
// Soft delete (deleted_at) — useEventsQuery.ts already filters
// `is('deleted_at', null)`, same convention as leagues/tournaments.
export default defineEventHandler(async (event) => {
  const { id, supabase } = await parseIdRequest(event)
  await softDeleteById(supabase, 'events', id)
  return { deleted: true }
})
