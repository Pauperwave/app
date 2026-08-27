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

    // No mechanism ever assigned this before (confirmed live 2026-08-27:
    // no trigger, no app code wrote it) — assigns the next sequential
    // PW-#### number here, but only if one isn't already set (a legacy row
    // fixed by hand via the edit modal, or a defensive re-approval). Never
    // reassigned on a later renewal (approve-renewal.post.ts doesn't touch
    // this at all) — an associate keeps the same number for life.
    if (!associate.pauperwave_associate_number) {
      const { data: number, error: numberError } = await supabase.rpc(
        'next_pauperwave_associate_number'
      )
      if (!numberError && number) {
        await supabase
          .from('pauperwave_associates')
          .update({ pauperwave_associate_number: number })
          .eq('id', associate.id)
      }
    }
  }

  return result
})
