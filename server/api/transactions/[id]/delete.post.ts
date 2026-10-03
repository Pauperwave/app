// server\api\transactions\[id]\delete.post.ts
import type { Database } from '#shared/utils/types/database'

// Soft delete (deleted_at), like tournaments/mtg-formats/wanted-cards. useTransactionsQuery.ts and
// remove_stale_payment_renewal filter on it, so a soft-deleted payment stops backing a renewal.
export default defineEventHandler(async (event) => {
  const { id, user, supabase } = await parseIdRequest(event)

  // Same admin-vs-organizer split as create.post.ts/[id]/update.post.ts: a membership-fee payment
  // backs a renewal, so deleting it is "Gestire le quote associative"
  const { data: payment } = await supabase
    .from('pauperwave_payments')
    .select('payment_type')
    .eq('id', id)
    .maybeSingle()
  if (payment?.payment_type === 'Association Fee') await requireAdminPermission(event)

  const deletedBy = await resolveAuditAssociateUuid(event, user)

  // Soft delete + stale-renewal cleanup in one Postgres transaction (delete_payment_with_renewal).
  //
  // Cast: see create.post.ts; deletedBy can be null but the generated Args type says `string`
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
