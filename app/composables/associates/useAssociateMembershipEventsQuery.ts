// app\composables\associates\useAssociateMembershipEventsQuery.ts
// Reads pauperwave_associate_membership_events (migration 20260827100000) for one associate: the
// append-only history behind /associate/[slug].vue's timeline, since pauperwave_associates is a
// single mutable row
import type { MembershipEventType } from '#shared/types/associates'

export interface AssociateMembershipEvent {
  id: number
  eventType: MembershipEventType
  occurredAt: string
}

export const ASSOCIATE_MEMBERSHIP_EVENTS_KEY = (associateUuid: string) =>
  ['associate-membership-events', associateUuid]

export function useAssociateMembershipEventsQuery(
  associateUuid: MaybeRefOrGetter<string | undefined>
) {
  const supabase = useSupabaseClient()

  return useQuery({
    key: () => ASSOCIATE_MEMBERSHIP_EVENTS_KEY(toValue(associateUuid) ?? ''),
    enabled: () => !!toValue(associateUuid),
    query: async (): Promise<AssociateMembershipEvent[]> => {
      const uuid = toValue(associateUuid)
      if (!uuid) return []

      const { data, error } = await supabase
        .from('pauperwave_associate_membership_events')
        .select('id, event_type, occurred_at')
        .eq('associate_uuid', uuid)
        .order('occurred_at', { ascending: true })

      if (error) throw error

      return (data ?? []).map(row => ({
        id: row.id,
        eventType: row.event_type as MembershipEventType,
        occurredAt: row.occurred_at
      }))
    }
  })
}
