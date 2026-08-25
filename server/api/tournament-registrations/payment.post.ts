// server\api\tournament-registrations\payment.post.ts
import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '#shared/utils/types/database'
import type { PaymentMethod } from '#shared/types/transactions'

interface PaymentBody {
  tournamentUuid: string
  associateUuid: string
  // null clears the payment (soft-delete) — AcceptancePicker.vue's
  // togglePaymentMethod un-toggling the same method it just set.
  method: PaymentMethod | null
  // Required to create a new payment (pauperwave_payments.received_by is
  // NOT NULL) — chosen once per check-in session from RECEIVER_OPTIONS, not
  // per click, since these buttons have no form of their own. Not required
  // when method is null (soft-delete doesn't touch received_by) or when
  // updating an existing payment in place (kept from the existing row,
  // rather than requiring re-selection for a plain method switch — though
  // AcceptancePicker.vue does send whatever's currently selected either way).
  receivedBy?: string
}

// One "Tournament Fee" pauperwave_payments row per (tournament, associate) —
// changing method (Cash -> POS) updates that row in place rather than
// creating a new one + soft-deleting the old, since it's the same session's
// correction, not a new transaction (user request, 2026-08-25). Untoggling
// (method: null) soft-deletes it (deleted_at/deleted_by), consistent with
// ADR-017's soft-delete convention for this table — never a hard delete of
// financial data.
export default defineEventHandler(async (event) => {
  const user = await requireManagementPermission(event)

  const {
    tournamentUuid, associateUuid, method, receivedBy
  } = await readBody<PaymentBody>(event)
  const supabase = serverSupabaseServiceRole<Database>(event)

  const { data: existing, error: existingError } = await supabase
    .from('pauperwave_payments')
    .select('uuid')
    .eq('tournament_uuid', tournamentUuid)
    .eq('associate_uuid', associateUuid)
    .eq('payment_type', 'Tournament Fee')
    .is('deleted_at', null)
    .maybeSingle()

  if (existingError) {
    throw createError({ statusCode: 500, statusMessage: existingError.message })
  }

  if (method === null) {
    if (!existing) return { payment: null }

    const { error } = await supabase
      .from('pauperwave_payments')
      .update({ ...await auditColumnsForUpdate(event, user), deleted_at: new Date().toISOString() })
      .eq('uuid', existing.uuid)

    if (error) throw createError({ statusCode: 500, statusMessage: error.message })
    return { payment: null }
  }

  const { data: tournament, error: tournamentError } = await supabase
    .from('tournaments')
    .select('entry_fee')
    .eq('uuid', tournamentUuid)
    .single()

  if (tournamentError) {
    throw createError({ statusCode: 500, statusMessage: tournamentError.message })
  }

  // Server-resolved, not trusting a client-sent amount — Comped is always
  // free, everything else is the tournament's own entry fee.
  const amount = method === 'Comped' ? 0 : (tournament.entry_fee ?? 0)

  if (existing) {
    const { data: payment, error } = await supabase
      .from('pauperwave_payments')
      .update({
        payment_method: method,
        payment_amount: amount,
        ...(receivedBy ? { received_by: receivedBy } : {}),
        ...await auditColumnsForUpdate(event, user)
      })
      .eq('uuid', existing.uuid)
      .select()
      .single()

    if (error) throw createError({ statusCode: 500, statusMessage: error.message })
    return { payment }
  }

  if (!receivedBy) {
    throw createError({ statusCode: 400, statusMessage: 'receivedBy is required to record a new payment' })
  }

  const { data: payment, error } = await supabase
    .from('pauperwave_payments')
    .insert({
      associate_uuid: associateUuid,
      tournament_uuid: tournamentUuid,
      payment_date: new Date().toISOString(),
      payment_amount: amount,
      payment_method: method,
      payment_type: 'Tournament Fee',
      received_by: receivedBy,
      ...await auditColumnsForInsert(event, user)
    })
    .select()
    .single()

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return { payment }
})
