// server\api\transactions\[id]\update.post.ts
import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '#shared/utils/types/database'
import type { NewTransactionPayload } from '#shared/types/transactions'

export default defineEventHandler(async (event) => {
  // Not parseIdMutationRequest (shared by other domains at a fixed
  // organizer tier) — this endpoint needs a conditional check, see below.
  const user = await requireUser(event)
  const id = Number(getRouterParam(event, 'id'))
  const body = await readBody<NewTransactionPayload>(event)
  validatePayerInfo(body)
  const supabase = serverSupabaseServiceRole<Database>(event)

  // Needed to reconcile pauperwave_associate_renewals below — the update
  // itself doesn't tell us what the payment used to look like. Also
  // decides the permission tier just below, so this read has to happen
  // before that check (requireUser above already gates it to logged-in
  // users only — no data is returned to the caller if the tier check
  // rejects afterward).
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

  // Same admin-vs-organizer split as create.post.ts, checked against BOTH
  // the old and new payment type — an organizer editing a payment INTO or
  // OUT OF "Association Fee" is still touching membership-fee territory
  // either way (found via audit, 2026-08-30).
  if (previousPayment.payment_type === 'Association Fee' || body.paymentType === 'Association Fee') {
    await requireAdminPermission(event)
  } else {
    await requireManagementPermission(event)
  }

  const { data: payment, error } = await supabase
    .from('pauperwave_payments')
    .update({
      ...buildTransactionFields(body),
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
