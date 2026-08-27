// server\api\associates\approve-renewal.post.ts
import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '#shared/utils/types/database'

interface ApproveRenewalBody {
  ids: number[]
}

// /associates' "Richieste (di rinnovo)" tab — acknowledges a renewal
// request without touching membership_request_status at all (that field
// never left 'approved' in the first place, see renew.post.ts). Separate
// from recording the actual Association Fee payment (the existing "Rinnova"
// action, which opens the transaction form) — approving the renewal REQUEST
// and recording the PAYMENT stay two distinct staff actions, same
// separation already in place for a first-time application (approve.post.ts
// vs. a later payment). Re-validates each id actually has an open, unresolved
// renewal_requested event server-side rather than trusting the client's
// selection, since the id could be stale by the time this runs.
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

  // Ascending order + last-write-wins means each entry ends up holding that
  // associate's most recent renewal event — only 'renewal_requested' there
  // means the renewal is still open (see usePendingRenewalRequestsQuery.ts,
  // same derivation client-side).
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
