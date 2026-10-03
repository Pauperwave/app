// server\api\wanted-cards\[id]\delete.post.ts
// Soft delete (deleted_at; useWantedCardsQuery.ts filters on it), like tournaments/mtg-formats. Not
// parseIdRequest (management-only): a requester can also delete their own card
// (requireManagementOrWantedCardOwner).
import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '#shared/utils/types/database'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  const supabase = serverSupabaseServiceRole<Database>(event)
  const user = await requireManagementOrWantedCardOwner(event, supabase, id)

  await softDeleteById(event, user, supabase, 'pauperwave_wanted_cards', id)
  return { deleted: true }
})
