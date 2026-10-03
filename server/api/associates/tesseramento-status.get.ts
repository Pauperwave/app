// server\api\associates\tesseramento-status.get.ts
import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '#shared/utils/types/database'

// Called after the /tesseramento OTP step, before the 9-step form: apply.post.ts 409s on any
// existing row for the email, so without this an approved associate only found out after filling
// the whole form. Lets the page branch up front: new email gets the form, approved gets one-click
// renewal, pending/rejected get a plain message.
export default defineEventHandler(async (event) => {
  const email = await requireUserEmail(event)

  const supabase = serverSupabaseServiceRole<Database>(event)
  const { data: existing } = await supabase
    .from('pauperwave_associates')
    .select('first_name, last_name, membership_request_status')
    .eq('email_address', email)
    .maybeSingle()

  if (!existing) return { kind: 'new' as const }

  if (existing.membership_request_status === 'approved') {
    return { kind: 'renewal' as const, firstName: existing.first_name, lastName: existing.last_name }
  }

  return { kind: 'blocked' as const }
})
