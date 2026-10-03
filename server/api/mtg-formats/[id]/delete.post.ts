// server\api\mtg-formats\[id]\delete.post.ts
// Soft delete (deleted_at), like tournaments/[id]/delete.post.ts: a format used by a past
// tournament must leave the active list without breaking that tournament's FK or losing its format
// name. useMtgFormatsQuery.ts filters on deleted_at.
export default defineEventHandler(async (event) => {
  const { id, user, supabase } = await parseIdRequest(event)
  await softDeleteById(event, user, supabase, 'mtg_formats', id)
  return { deleted: true }
})
