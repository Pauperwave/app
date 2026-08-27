// server\api\associates\tesseramento-status.get.ts
import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '#shared/utils/types/database'

// Called right after the /tesseramento OTP step resolves, before showing the
// 9-step application form — apply.post.ts's insert-only contract 409s on any
// existing row for this email regardless of status, which used to be the
// ONLY signal an already-approved associate got back after filling out the
// whole form again to renew (user request, 2026-08-27: "il form di
// tesseramento prende in considerazione solo una nuova iscrizione ma non
// prende in considerazione il flusso di rinnovamento"). This lets the page
// branch before the form even renders: a genuinely new email still gets the
// full form, an approved associate gets a one-click renewal confirmation
// instead, and a pending/rejected one gets told plainly instead of a raw 409
// after 9 steps.
export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  if (!user.email) {
    throw createError({ statusCode: 401, statusMessage: 'Email non presente nella sessione' })
  }

  const supabase = serverSupabaseServiceRole<Database>(event)
  const { data: existing } = await supabase
    .from('pauperwave_associates')
    .select('first_name, last_name, membership_request_status')
    .eq('email_address', user.email)
    .maybeSingle()

  if (!existing) return { kind: 'new' as const }

  if (existing.membership_request_status === 'approved') {
    return { kind: 'renewal' as const, firstName: existing.first_name, lastName: existing.last_name }
  }

  return { kind: 'blocked' as const }
})
