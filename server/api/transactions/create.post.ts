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

  // An "Association Fee" payment for a known associate IS a renewal — insert the
  // current year's row in pauperwave_associate_renewals, the table
  // pauperwave_associates_with_status actually derives membership_status from
  // (see migration 20260805035231). ignoreDuplicates: a second Association Fee
  // payment in the same year (e.g. an amount correction) is valid and shouldn't
  // fail the transaction just because that year's renewal row already exists.
  let renewed = false
  if (body.paymentType === 'Association Fee' && body.associateUuid) {
    const { error: renewalError, data: renewalRows } = await supabase
      .from('pauperwave_associate_renewals')
      .upsert(
        {
          associate_uuid: body.associateUuid,
          renewal_year: new Date().getFullYear()
        },
        { onConflict: 'associate_uuid,renewal_year', ignoreDuplicates: true }
      )
      .select()

    if (renewalError) {
      throw createError({
        statusCode: 500,
        statusMessage: renewalError.message ?? 'Transaction saved but renewal recording failed'
      })
    }
    renewed = (renewalRows?.length ?? 0) > 0
  }

  return { transaction: payment, renewed }
})
