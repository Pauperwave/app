// server\api\mtg-formats\[id]\delete.post.ts
// Soft delete (deleted_at), not a hard row delete (2026-08-16) — a hard
// delete only worked while fk_tournaments_format_uuid_fkey rejected it for
// any format still referenced by a tournament; a format used by a past
// tournament should still be removable from the active list without
// breaking that tournament's own FK or losing its format name. Same
// convention as tournaments/[id]/delete.post.ts —
// mtgFormats/useMtgFormatsQuery.ts already filters `is('deleted_at', null)`.
export default defineEventHandler(async (event) => {
  const { id, supabase } = await parseIdRequest(event)
  await softDeleteById(supabase, 'mtg_formats', id)
  return { deleted: true }
})
