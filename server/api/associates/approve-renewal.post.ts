// server\api\associates\approve-renewal.post.ts
import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '#shared/utils/types/database'

interface ApproveRenewalBody {
  ids: number[]
}

// /associates "Richieste (di rinnovo)" tab: acknowledges a renewal request without touching
// membership_request_status (it stays 'approved', see renew.post.ts). Separate from recording the
// Association Fee payment ("Rinnova"), like first-time applications. Re-validates server-side that
// each id has an open renewal_requested event, since the client's selection may be stale.
export default defineEventHandler(async (event) => {
  await requireManagementPermission(event)

  const { ids } = await readBody<ApproveRenewalBody>(event)
  if (!ids?.length) {
    throw createError({ statusCode: 400, statusMessage: 'No associate ids provided' })
  }

  const supabase = serverSupabaseServiceRole<Database>(event)

  const { data: associates, error: associatesError } = await supabase
    .from('pauperwave_associates')
    .select('id, uuid')
    .in('id', ids)

  if (associatesError) {
    throw createError({ statusCode: 500, statusMessage: associatesError.message })
  }

  const uuids = (associates ?? []).map(associate => associate.uuid)
  const { data: events, error: eventsError } = await supabase
    .from('pauperwave_associate_membership_events')
    .select('associate_uuid, event_type, occurred_at')
    .in('associate_uuid', uuids)
    .in('event_type', ['renewal_requested', 'renewal_approved'])
    .order('occurred_at', { ascending: true })

  if (eventsError) {
    throw createError({ statusCode: 500, statusMessage: eventsError.message })
  }

  // Ascending order + last-write-wins keeps each associate's latest renewal event; only
  // 'renewal_requested' means still open (same derivation as usePendingRenewalRequestsQuery.ts)
  const latestEventByAssociate = new Map<string, string>()
  for (const row of events ?? []) latestEventByAssociate.set(row.associate_uuid, row.event_type)

  const approvedUuids: string[] = []
  for (const associate of associates ?? []) {
    if (latestEventByAssociate.get(associate.uuid) !== 'renewal_requested') continue
    await recordMembershipEvent(supabase, associate.uuid, 'renewal_approved')
    approvedUuids.push(associate.uuid)
  }

  return { approvedUuids }
})
