// server\api\wanted-cards\[id]\delete.post.ts
// Soft delete (deleted_at), not a hard row delete (2026-08-16) — same
// convention as tournaments/mtg-formats' own deleted_at columns.
// useWantedCardsQuery.ts already filters `is('deleted_at', null)`.
// Doesn't use parseIdRequest (management-only) — a requester can also
// delete their own card, see requireManagementOrWantedCardOwner.
import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '#shared/utils/types/database'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  const supabase = serverSupabaseServiceRole<Database>(event)
  const user = await requireManagementOrWantedCardOwner(event, supabase, id)

  await softDeleteById(event, user, supabase, 'pauperwave_wanted_cards', id)
  return { deleted: true }
})
