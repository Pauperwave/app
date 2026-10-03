// server\api\associates\approve.post.ts
import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '#shared/utils/types/database'

// /associates/requests bulk "Approva": only sees new applicants, since a renewal never flips
// membership_request_status away from 'approved' (see approve-renewal.post.ts), so every approval
// here is a first-ever one.
export default defineEventHandler(async (event) => {
  const result = await bulkUpdateMembershipRequestStatus(event, 'approved', 'approval')

  const supabase = serverSupabaseServiceRole<Database>(event)
  for (const associate of result.associates ?? []) {
    await recordMembershipEvent(supabase, associate.uuid, 'approved')

    // Assigns the next sequential PW-#### number unless one is already set (legacy row fixed by
    // hand, or re-approval). Never reassigned on renewal: a member keeps the number for life.
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
