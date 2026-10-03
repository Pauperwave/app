// server\api\associates\renew.post.ts
import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '#shared/utils/types/database'

// /tesseramento renewal confirm action. Leaves membership_request_status alone: an approved
// associate stays 'approved' and never re-enters the new-applicant queue. "Open renewal request" is
// derived from the latest renewal event (usePendingRenewalRequestsQuery.ts) and shown in its own
// /associates tab.
export default defineEventHandler(async (event) => {
  const email = await requireUserEmail(event)

  const supabase = serverSupabaseServiceRole<Database>(event)

  const { data: associate, error } = await supabase
    .from('pauperwave_associates')
    .select('uuid, first_name, last_name')
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

  await notifyTelegramAdmins(
    event,
    `🔄 Richiesta di rinnovo tesseramento: ${associate.first_name} ${associate.last_name}`
  )

  return { associate }
})
