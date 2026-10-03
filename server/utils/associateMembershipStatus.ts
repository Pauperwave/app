// server\utils\associateMembershipStatus.ts
import { serverSupabaseServiceRole } from '#supabase/server'
import type { H3Event } from 'h3'
import type { Database } from '#shared/utils/types/database'

interface BulkMembershipStatusBody {
  ids: number[]
}

// Shared by approve/reject/restore.post.ts: the same bulk update, differing only by target
// membership_request_status and the error noun
export async function bulkUpdateMembershipRequestStatus(
  event: H3Event,
  status: 'approved' | 'rejected' | 'pending',
  actionNoun: string
) {
  const user = await requireManagementPermission(event)

  const { ids } = await readBody<BulkMembershipStatusBody>(event)
  if (!ids?.length) {
    throw createError({
      statusCode: 400,
      statusMessage: 'No associate ids provided'
    })
  }

  const supabase = serverSupabaseServiceRole<Database>(event)

  const { data, error } = await supabase
    .from('pauperwave_associates')
    .update({ membership_request_status: status, ...await auditColumnsForUpdate(event, user) })
    .in('id', ids)
    .select()

  if (error) {
    throw createError({
      statusCode: 500,
      statusMessage: error.message ?? `Associates ${actionNoun} failed`
    })
  }

  return { associates: data }
}
