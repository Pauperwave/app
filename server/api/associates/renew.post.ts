// server\api\associates\renew.post.ts
import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '#shared/utils/types/database'

// The /tesseramento renewal step's confirm action. Does NOT touch
// membership_request_status at all (reworked 2026-08-27, user request) — an
// approved associate stays 'approved' through a renewal request, they never
// re-enter /associates/requests' new-applicant triage queue. "Has an open
// renewal request" is a derived state instead (usePendingRenewalRequestsQuery.ts:
// latest of this associate's renewal_requested/renewal_approved events is
// renewal_requested), surfaced as its own tab on /associates rather than a
// status flip on the row.
export default defineEventHandler(async (event) => {
  const email = await requireUserEmail(event)

  const supabase = serverSupabaseServiceRole<Database>(event)

  const { data: associate, error } = await supabase
    .from('pauperwave_associates')
    .select('uuid')
    .eq('email_address', email)
    .eq('membership_request_status', 'approved')
    .maybeSingle()

  if (error || !associate) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Nessun tesseramento approvato trovato per questa email'
    })
  }

  await recordMembershipEvent(supabase, associate.uuid, 'renewal_requested')

  return { associate }
})
