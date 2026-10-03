// server\api\transactions\create.post.ts
import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '#shared/utils/types/database'
import type { NewTransactionPayload } from '#shared/types/transactions'

export default defineEventHandler(async (event) => {
  const body = await readBody<NewTransactionPayload>(event)
  validatePayerInfo(body)

  // Association Fee payments renew a member's tesseramento, so they need the same tier as "gestire
  // l'anagrafica soci" (admin), not routine organizer payment registration
  // (docs/architecture/permissions.md, "Gestire le quote associative").
  const user = body.paymentType === 'Association Fee'
    ? await requireAdminPermission(event)
    : await requireManagementPermission(event)

  const supabase = serverSupabaseServiceRole<Database>(event)
  const createdBy = await resolveAuditAssociateUuid(event, user)

  // Payment write + renewal reconciliation in one Postgres transaction
  // (create_payment_with_renewal).
  //
  // Cast: function params carry no introspectable nullability, so the generated Args type says
  // `string` even for params backed by nullable columns (associateUuid, payerName, ...), which
  // accept null at runtime
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
