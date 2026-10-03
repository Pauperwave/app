// server\utils\associateMembershipEvents.ts
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '#shared/utils/types/database'
import type { MembershipEventType } from '#shared/types/associates'

// Append-only history for /associate/[slug].vue's timeline: pauperwave_associates is a single
// mutable row, so each membership-lifecycle moment is logged here before the next status change
// overwrites it. Best-effort: a failed insert doesn't fail the request; the associate row stays the
// source of truth.
export async function recordMembershipEvent(
  supabase: SupabaseClient<Database>,
  associateUuid: string,
  eventType: MembershipEventType
) {
  const { error } = await supabase
    .from('pauperwave_associate_membership_events')
    .insert({ associate_uuid: associateUuid, event_type: eventType })

  if (error) {
    console.error(`Failed to record membership event "${eventType}" for ${associateUuid}:`, error.message)
  }
}
