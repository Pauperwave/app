// server\api\tournaments\[id]\delete.post.ts
// Soft delete (deleted_at), not a hard row delete — useTournamentsQuery.ts
// already filters `is('deleted_at', null)`, same convention as
// pauperwave_associates/pauperwave_payments; a tournament that already
// happened shouldn't vanish from history just because it's removed from the
// active list.
export default defineEventHandler(async (event) => {
  const { id, supabase } = await parseIdRequest(event)
  await softDeleteById(supabase, 'tournaments', id)
  return { deleted: true }
})
