// app\composables\associates\usePendingRenewalRequestsQuery.ts
// The set of associate uuids with an open, unresolved renewal request —
// "Richieste (di rinnovo)" tab on /associates (user request, 2026-08-27).
// renew.post.ts never flips membership_request_status, so this is entirely
// derived from pauperwave_associate_membership_events: an associate has an
// open renewal request iff their most recent renewal_requested/
// renewal_approved event is renewal_requested.
export const PENDING_RENEWAL_REQUESTS_KEY = ['pending-renewal-requests']

export function usePendingRenewalRequestsQuery() {
  const supabase = useSupabaseClient()
  const { isStaff } = useUserRole()

  return useQuery({
    key: PENDING_RENEWAL_REQUESTS_KEY,
    enabled: () => isStaff.value,
    query: async (): Promise<Set<string>> => {
      const fetchPage = (from: number, to: number) => supabase
        .from('pauperwave_associate_membership_events')
        .select('associate_uuid, event_type')
        .in('event_type', ['renewal_requested', 'renewal_approved'])
        .order('occurred_at', { ascending: true })
        .range(from, to)

      const data = await fetchAllRows(fetchPage)

      // Ascending order + last-write-wins: each entry ends up holding that
      // associate's most recent renewal event.
      const latestByAssociate = new Map<string, string>()
      for (const row of data) latestByAssociate.set(row.associate_uuid, row.event_type)

      return new Set(
        [...latestByAssociate.entries()]
          .filter(([, eventType]) => eventType === 'renewal_requested')
          .map(([associateUuid]) => associateUuid)
      )
    }
  })
}
