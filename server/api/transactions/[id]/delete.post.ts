// server\api\transactions\[id]\delete.post.ts
// Soft delete (deleted_at), not a hard row delete (2026-08-16) — same
// convention as tournaments/mtg-formats/wanted-cards' own deleted_at
// columns. useTransactionsQuery.ts already filters `is('deleted_at', null)`,
// and removeStaleRenewal's own count query below does too, so a soft-deleted
// payment stops counting as backing a renewal.
export default defineEventHandler(async (event) => {
  const { id, supabase } = await parseIdRequest(event)

  // Needed to reconcile pauperwave_associate_renewals below — once the row is
  // gone there's no way to know what it used to back.
  const { data: payment, error: fetchError } = await supabase
    .from('pauperwave_payments')
    .select('associate_uuid, payment_type, payment_date')
    .eq('id', id)
    .single()

  if (fetchError || !payment) {
    throw createError({
      statusCode: 404,
      statusMessage: fetchError?.message ?? 'Transaction not found'
    })
  }

  await softDeleteById(supabase, 'pauperwave_payments', id)

  // Deleting an "Association Fee" payment for a known associate must not
  // leave a renewal row with nothing backing it — otherwise the associate
  // stays "active" (pauperwave_associates_with_status) for a fee that was
  // just removed. See server/utils/associateRenewals.ts.
  if (payment.payment_type === 'Association Fee' && payment.associate_uuid) {
    await removeStaleRenewal(supabase, {
      associateUuid: payment.associate_uuid,
      paymentDate: payment.payment_date
    })
  }

  return { deleted: true }
})
