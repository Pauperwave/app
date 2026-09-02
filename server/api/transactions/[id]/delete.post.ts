// server\api\transactions\[id]\delete.post.ts
import type { Database } from '#shared/utils/types/database'

// Soft delete (deleted_at), not a hard row delete (2026-08-16) — same
// convention as tournaments/mtg-formats/wanted-cards' own deleted_at
// columns. useTransactionsQuery.ts already filters `is('deleted_at', null)`,
// and remove_stale_payment_renewal's own count query does too, so a
// soft-deleted payment stops counting as backing a renewal.
export default defineEventHandler(async (event) => {
  const { id, user, supabase } = await parseIdRequest(event)
  const deletedBy = await resolveAuditAssociateUuid(event, user)

  // Soft delete + stale-renewal cleanup happen in one Postgres transaction
  // (delete_payment_with_renewal, migration 20260902105738) — previously two
  // separate Supabase JS calls, where a failure in the second could leave
  // a deleted payment's renewal still on the books.
  //
  // Cast: see the same comment in create.post.ts — deletedBy can be null
  // (resolveAuditAssociateUuid), but Postgres function args have no
  // introspectable nullability so the generated Args type says `string`.
  const { error } = await supabase.rpc('delete_payment_with_renewal', {
    p_id: id,
    p_deleted_by: deletedBy
  } as Database['public']['Functions']['delete_payment_with_renewal']['Args'])

  if (error) {
    throw createError({
      statusCode: error.code === 'P0002' ? 404 : 500,
      statusMessage: error.message ?? 'Transaction deletion failed'
    })
  }

  return { deleted: true }
})
