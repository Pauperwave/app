// server\utils\associateRenewals.ts
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '#shared/utils/types/database'

// pauperwave_associates_with_status derives membership_status from
// pauperwave_associate_renewals (migration 20260805035231) — an "Association
// Fee" payment is what makes an associate renewed, so the renewal row's
// lifecycle has to follow the payment's, not just get created and forgotten.
// renewal_year is derived from the payment's own payment_date (not "now" at
// write time) so create/update/delete all agree on which year a given
// payment belongs to — a payment entered today for a backdated date is that
// date's renewal, not today's.
export function renewalYearFor(paymentDate: string): number {
  return new Date(paymentDate).getFullYear()
}

// Called after an insert/update leaves a payment as "Association Fee" for a
// known associate — same upsert create.post.ts always did, extracted so
// update.post.ts can call it too when a payment newly becomes (or stays) an
// Association Fee payment. ignoreDuplicates: a second Association Fee
// payment in the same year (e.g. an amount correction) is valid and
// shouldn't fail just because that year's renewal row already exists.
export async function ensureRenewalForPayment(
  supabase: SupabaseClient<Database>,
  params: { associateUuid: string, paymentDate: string }
): Promise<boolean> {
  const { error, data } = await supabase
    .from('pauperwave_associate_renewals')
    .upsert(
      { associate_uuid: params.associateUuid, renewal_year: renewalYearFor(params.paymentDate) },
      { onConflict: 'associate_uuid,renewal_year', ignoreDuplicates: true }
    )
    .select()

  if (error) {
    throw createError({
      statusCode: 500,
      statusMessage: error.message ?? 'Renewal recording failed'
    })
  }
  return (data?.length ?? 0) > 0
}

// Called after a delete, or after an update moves a payment away from
// "Association Fee" (or to a different associate/year) — removes that
// year's renewal row for the associate, but only if no OTHER Association Fee
// payment for the same associate+year still exists. Without that check, a
// legitimate correction (splitting/duplicating a fee payment, deleting one
// of two) would incorrectly un-renew someone who genuinely paid.
export async function removeStaleRenewal(
  supabase: SupabaseClient<Database>,
  params: { associateUuid: string, paymentDate: string, excludePaymentId?: number }
): Promise<void> {
  const year = renewalYearFor(params.paymentDate)
  const yearStart = `${year}-01-01T00:00:00.000Z`
  const yearEnd = `${year + 1}-01-01T00:00:00.000Z`

  let query = supabase
    .from('pauperwave_payments')
    .select('id', { count: 'exact', head: true })
    .eq('associate_uuid', params.associateUuid)
    .eq('payment_type', 'Association Fee')
    .gte('payment_date', yearStart)
    .lt('payment_date', yearEnd)
    // Excludes soft-deleted payments (2026-08-16) — delete.post.ts now
    // soft-deletes the triggering row before calling this, so without this
    // filter it would still count as "another payment still backs this
    // renewal" and the stale renewal would never get cleaned up.
    .is('deleted_at', null)

  if (params.excludePaymentId !== undefined) {
    query = query.neq('id', params.excludePaymentId)
  }

  const { count, error: countError } = await query
  if (countError) {
    throw createError({
      statusCode: 500,
      statusMessage: countError.message ?? 'Renewal cleanup check failed'
    })
  }
  if ((count ?? 0) > 0) return

  const { error: deleteError } = await supabase
    .from('pauperwave_associate_renewals')
    .delete()
    .eq('associate_uuid', params.associateUuid)
    .eq('renewal_year', year)

  if (deleteError) {
    throw createError({
      statusCode: 500,
      statusMessage: deleteError.message ?? 'Renewal cleanup failed'
    })
  }
}
