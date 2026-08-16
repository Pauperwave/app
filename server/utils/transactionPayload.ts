// server\utils\transactionPayload.ts
import type { NewTransactionPayload } from '#shared/types/transactions'

// Shared by transactions/create.post.ts and transactions/[id]/update.post.ts
// (fallow:dupes flagged this as an identical clone) — same
// pauperwave_payments' own ck_payer_info constraint, checked here too so a
// violation surfaces as a clear 400, not a raw Postgres error message.
export function validatePayerInfo(body: NewTransactionPayload) {
  const hasPayerInfo = !!(body.payerName && body.payerSurname && body.payerEmail)
  if (!body.associateUuid && !hasPayerInfo) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Either associateUuid or payer name/surname/email is required'
    })
  }
}

// Field mapping shared by the same two endpoints — callers spread their own
// auditColumnsForInsert/auditColumnsForUpdate on top.
export function buildTransactionFields(body: NewTransactionPayload) {
  return {
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
    notes: body.notes
  }
}
