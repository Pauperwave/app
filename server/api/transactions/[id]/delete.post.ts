// server\api\transactions\[id]\delete.post.ts
import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '#shared/utils/types/database'

export default defineEventHandler(async (event) => {
  await requireManagementPermission(event)

  const id = Number(getRouterParam(event, 'id'))
  const supabase = serverSupabaseServiceRole<Database>(event)

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

  const { error } = await supabase
    .from('pauperwave_payments')
    .delete()
    .eq('id', id)

  if (error) {
    throw createError({
      statusCode: 500,
      statusMessage: error.message
    })
  }

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
