// server\api\transactions\create.post.ts
import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '#shared/utils/types/database'
import type { NewTransactionPayload } from '#shared/types/transactions'

export default defineEventHandler(async (event) => {
  const user = await requireManagementPermission(event)

  const body = await readBody<NewTransactionPayload>(event)

  // Same rule as pauperwave_payments' own ck_payer_info constraint — checked here
  // too so a violation surfaces as a clear 400, not a raw Postgres error message.
  const hasPayerInfo = !!(body.payerName && body.payerSurname && body.payerEmail)
  if (!body.associateUuid && !hasPayerInfo) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Either associateUuid or payer name/surname/email is required'
    })
  }

  const supabase = serverSupabaseServiceRole<Database>(event)

  const { data: payment, error } = await supabase
    .from('pauperwave_payments')
    .insert({
      associate_uuid: body.associateUuid,
      payer_name: body.payerName,
      payer_surname: body.payerSurname,
      payer_email: body.payerEmail,
      payer_tax_code: body.payerTaxCode,
      payment_date: body.paymentDate,
      payment_amount: body.paymentAmount,
      payment_method: body.paymentMethod,
      payment_type: body.paymentType,
      received_by: body.receivedBy,
      event_uuid: body.eventUuid,
      event_name: body.eventName,
      notes: body.notes,
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
