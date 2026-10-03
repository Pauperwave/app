// server\api\tournament-registrations\payment.post.ts
import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '#shared/utils/types/database'
import type { PaymentMethod } from '#shared/types/transactions'

interface PaymentBody {
  tournamentUuid: string
  associateUuid: string
  // null clears the payment (soft-delete), e.g. un-toggling the method just set
  method: PaymentMethod | null
  // Required to create a payment (pauperwave_payments.received_by is NOT NULL); chosen once per
  // check-in session, not per click. Not needed to clear a payment, and kept from the existing row
  // on update.
  receivedBy?: string
}

// One "Tournament Fee" row per (tournament, associate): changing method (Cash -> POS) updates it in
// place, being a correction rather than a new transaction. Untoggling (method: null) soft-deletes
// it (deleted_at/deleted_by, ADR-017): financial data is never hard-deleted.
export default defineEventHandler(async (event) => {
  const user = await requireManagementPermission(event)

  const {
    tournamentUuid, associateUuid, method, receivedBy
  } = await readBody<PaymentBody>(event)
  const supabase = serverSupabaseServiceRole<Database>(event)
  await assertRegistrationsEditable(supabase, tournamentUuid)

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

  // Server-resolved, never a client-sent amount: Comped is free, everything else is the entry fee
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
