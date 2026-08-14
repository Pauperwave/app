// server\api\transactions\[id]\update.post.ts
import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '#shared/utils/types/database'
import type { NewTransactionPayload } from '#shared/types/transactions'

export default defineEventHandler(async (event) => {
  const user = await requireManagementPermission(event)

  const id = Number(getRouterParam(event, 'id'))
  const body = await readBody<NewTransactionPayload>(event)

  // Same rule as pauperwave_payments' own ck_payer_info constraint — see
  // create.post.ts.
  const hasPayerInfo = !!(body.payerName && body.payerSurname && body.payerEmail)
  if (!body.associateUuid && !hasPayerInfo) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Either associateUuid or payer name/surname/email is required'
    })
  }

  const supabase = serverSupabaseServiceRole<Database>(event)

  // Needed to reconcile pauperwave_associate_renewals below — the update
  // itself doesn't tell us what the payment used to look like.
  const { data: previousPayment, error: previousError } = await supabase
    .from('pauperwave_payments')
    .select('associate_uuid, payment_type, payment_date')
    .eq('id', id)
    .single()

  if (previousError || !previousPayment) {
    throw createError({
      statusCode: 404,
      statusMessage: previousError?.message ?? 'Transaction not found'
    })
  }

  const { data: payment, error } = await supabase
    .from('pauperwave_payments')
    .update({
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
      ...await auditColumnsForUpdate(event, user)
    })
    .eq('id', id)
    .select()
    .single()

  if (error || !payment) {
    throw createError({
      statusCode: 500,
      statusMessage: error?.message ?? 'Transaction update failed'
    })
  }

  // If this payment used to back a renewal (was "Association Fee" for a known
  // associate) and no longer does — type changed, associate changed, or the
  // date moved to a different year — that renewal row must go too, or the
  // associate stays "active" for a fee that no longer has any payment behind
  // it. Only removes it if no OTHER Association Fee payment for that
  // associate+year still exists (see removeStaleRenewal).
  const previousYear = previousPayment.payment_date
    ? renewalYearFor(previousPayment.payment_date)
    : null
  const newYear = body.paymentType === 'Association Fee' ? renewalYearFor(body.paymentDate) : null
  const renewalTargetChanged = previousPayment.associate_uuid !== body.associateUuid
    || previousYear !== newYear

  if (previousPayment.payment_type === 'Association Fee' && previousPayment.associate_uuid
    && renewalTargetChanged) {
    await removeStaleRenewal(supabase, {
      associateUuid: previousPayment.associate_uuid,
      paymentDate: previousPayment.payment_date,
      excludePaymentId: id
    })
  }

  // Same renewal-recording rule as create.post.ts — editing a payment into (or
  // within) "Association Fee" for a known associate should still count as a
  // renewal.
  let renewed = false
  if (body.paymentType === 'Association Fee' && body.associateUuid) {
    renewed = await ensureRenewalForPayment(supabase, {
      associateUuid: body.associateUuid,
      paymentDate: body.paymentDate
    })
  }

  return { transaction: payment, renewed }
})
