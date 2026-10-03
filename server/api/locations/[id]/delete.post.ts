// server\api\locations\[id]\delete.post.ts
// Soft delete (deleted_at), like tournaments/mtg-formats; useLocationsQuery.ts filters on it. No UI
// calls it yet: it makes the table Trash-restorable once a delete action exists.
export default defineEventHandler(async (event) => {
  const { id, user, supabase } = await parseIdRequest(event)
  await softDeleteById(event, user, supabase, 'locations', id)
  return { deleted: true }
})
