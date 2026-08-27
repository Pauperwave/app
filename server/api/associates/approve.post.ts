// server\api\associates\approve.post.ts
import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '#shared/utils/types/database'

// /associates/requests' bulk "Approva" — only ever sees genuinely new
// applicants now that a renewal never flips membership_request_status away
// from 'approved' (reworked 2026-08-27, user request; see
// approve-renewal.post.ts for the separate renewal-acknowledgement action).
// So every approval logged here really is a first-ever approval, no
// per-associate branching needed.
export default defineEventHandler(async (event) => {
  const result = await bulkUpdateMembershipRequestStatus(event, 'approved', 'approval')

  const supabase = serverSupabaseServiceRole<Database>(event)
  for (const associate of result.associates ?? []) {
    await recordMembershipEvent(supabase, associate.uuid, 'approved')
  }

  return result
})
