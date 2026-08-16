// server\api\transactions\create.post.ts
import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '#shared/utils/types/database'
import type { NewTransactionPayload } from '#shared/types/transactions'

export default defineEventHandler(async (event) => {
  const user = await requireManagementPermission(event)

  const body = await readBody<NewTransactionPayload>(event)
  validatePayerInfo(body)

  const supabase = serverSupabaseServiceRole<Database>(event)

  const { data: payment, error } = await supabase
    .from('pauperwave_payments')
    .insert({
      ...buildTransactionFields(body),
      ...await auditColumnsForInsert(event, user)
    })
    .select()
    .single()

  if (error || !payment) {
    throw createError({
      statusCode: 500,
      statusMessage: error?.message ?? 'Transaction creation failed'
    })
  }

  // An "Association Fee" payment for a known associate IS a renewal — see
  // server/utils/associateRenewals.ts.
  let renewed = false
  if (body.paymentType === 'Association Fee' && body.associateUuid) {
    renewed = await ensureRenewalForPayment(supabase, {
      associateUuid: body.associateUuid,
      paymentDate: body.paymentDate
    })
  }

  return { transaction: payment, renewed }
})
