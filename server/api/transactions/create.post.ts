// server\api\transactions\create.post.ts
import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '#shared/utils/types/database'
import type { NewTransactionPayload } from '#shared/types/transactions'

export default defineEventHandler(async (event) => {
  const body = await readBody<NewTransactionPayload>(event)
  validatePayerInfo(body)

  // Association Fee payments renew a member's tesseramento status
  // (create_payment_with_renewal RPC below) — treated the same as "gestire
  // l'anagrafica soci" (admin), not routine event/tournament payment
  // registration (organizer). See docs/architecture/permissions.md's
  // "Gestire le quote associative" row (admin-only) — this endpoint
  // previously enforced only requireManagementPermission for every payment
  // type, letting an organizer create Association Fee payments via the API
  // even though the matrix reserves that to admin (found via audit,
  // 2026-08-30).
  const user = body.paymentType === 'Association Fee'
    ? await requireAdminPermission(event)
    : await requireManagementPermission(event)

  const supabase = serverSupabaseServiceRole<Database>(event)
  const createdBy = await resolveAuditAssociateUuid(event, user)

  // Payment write + renewal reconciliation happen in one Postgres
  // transaction (create_payment_with_renewal, migration 20260902105738) —
  // previously two separate Supabase JS calls, where a failure in the
  // second could leave the payment recorded with no matching renewal.
  //
  // Cast: Postgres function parameters carry no introspectable nullability
  // (unlike table columns' information_schema.is_nullable), so the
  // generated Args type shows plain `string` even for params backed by
  // nullable columns (associateUuid, payerName, ...) — verified these
  // accept null at runtime (tested directly against the function).
  const { data, error } = await supabase.rpc('create_payment_with_renewal', {
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
    p_created_by: createdBy
  } as Database['public']['Functions']['create_payment_with_renewal']['Args'])

  const result = data?.[0]
  if (error || !result) {
    throw createError({
      statusCode: 500,
      statusMessage: error?.message ?? 'Transaction creation failed'
    })
  }

  return {
    transaction: { id: result.created_payment_id, uuid: result.created_payment_uuid },
    renewed: result.renewed
  }
})
