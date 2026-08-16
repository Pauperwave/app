// server\api\wanted-cards\[id]\delete.post.ts
// Soft delete (deleted_at), not a hard row delete (2026-08-16) — same
// convention as tournaments/mtg-formats' own deleted_at columns.
// useWantedCardsQuery.ts already filters `is('deleted_at', null)`.
export default defineEventHandler(async (event) => {
  const { id, supabase } = await parseIdRequest(event)
  await softDeleteById(supabase, 'pauperwave_wanted_cards', id)
  return { deleted: true }
})
