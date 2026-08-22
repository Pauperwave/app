// server\api\leagues\[id]\delete.post.ts
// Soft delete (deleted_at) — useLeaguesQuery.ts already filters
// `is('deleted_at', null)`, same convention as tournaments/mtg_formats.
export default defineEventHandler(async (event) => {
  const { id, user, supabase } = await parseIdRequest(event)
  await softDeleteById(event, user, supabase, 'leagues', id)
  return { deleted: true }
})
