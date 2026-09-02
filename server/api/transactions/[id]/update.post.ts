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

  // Needed only to decide the permission tier below (admin vs. organizer) —
  // update_payment_with_renewal re-reads the previous row itself, inside the
  // same transaction as the write, so there's no risk of it going stale
  // between this check and the RPC call.
  const { data: previousPayment, error: previousError } = await supabase
    .from('pauperwave_payments')
    .select('payment_type')
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

  const updatedBy = await resolveAuditAssociateUuid(event, user)

  // Payment write + stale-renewal cleanup + renewal reconciliation all
  // happen in one Postgres transaction (update_payment_with_renewal,
  // migration 20260902105738) — previously three separate Supabase JS
  // calls, where a failure partway through could leave the payment updated
  // but the renewal rows out of sync with it.
  //
  // Cast: see the same comment in create.post.ts — Postgres function args
  // have no introspectable nullability, the generated Args type is wrong
  // here for the columns that are genuinely nullable.
  const { data, error } = await supabase.rpc('update_payment_with_renewal', {
    p_id: id,
    p_associate_uuid: body.associateUuid,
    p_payer_name: body.payerName,
    p_payer_surname: body.payerSurname,
    p_payer_email: body.payerEmail,
    p_payer_tax_code: body.payerTaxCode,
    p_payment_date: body.paymentDate,
    p_payment_amount: body.paymentAmount,
    p_payment_method: body.paymentMethod,
    p_payment_type: body.paymentType,
    p_received_by: body.receivedBy,
    p_tournament_uuid: body.tournamentUuid,
    p_event_uuid: body.eventUuid,
    p_event_name: body.eventName,
    p_notes: body.notes,
    p_updated_by: updatedBy
  } as Database['public']['Functions']['update_payment_with_renewal']['Args'])

  const result = data?.[0]
  if (error || !result) {
    throw createError({
      statusCode: error?.code === 'P0002' ? 404 : 500,
      statusMessage: error?.message ?? 'Transaction update failed'
    })
  }

  return {
    transaction: { id: result.updated_payment_id, uuid: result.updated_payment_uuid },
    renewed: result.renewed
  }
})
