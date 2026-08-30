// server\api\transactions\create.post.ts
import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '#shared/utils/types/database'
import type { NewTransactionPayload } from '#shared/types/transactions'

export default defineEventHandler(async (event) => {
  const body = await readBody<NewTransactionPayload>(event)
  validatePayerInfo(body)

  // Association Fee payments renew a member's tesseramento status
  // (ensureRenewalForPayment below) — treated the same as "gestire
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
