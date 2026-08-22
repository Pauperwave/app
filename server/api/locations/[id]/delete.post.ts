// server\api\locations\[id]\delete.post.ts
// Soft delete (deleted_at), not a hard row delete (2026-08-23) — same
// convention as tournaments/mtg-formats' own deleted_at columns.
// useLocationsQuery.ts already filters `is('deleted_at', null)`. No UI wires
// this yet (locations/index.vue is still create+edit only, per earlier user
// request — see useLocationsRowActions.ts's own comment); this endpoint just
// makes the table Trash-restorable whenever a delete action is added.
export default defineEventHandler(async (event) => {
  const { id, user, supabase } = await parseIdRequest(event)
  await softDeleteById(event, user, supabase, 'locations', id)
  return { deleted: true }
})
