// server\utils\associateMembershipEvents.ts
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '#shared/utils/types/database'
import type { MembershipEventType } from '#shared/types/associates'

// Append-only history for /associate/[slug].vue's timeline (user request,
// 2026-08-27) — pauperwave_associates itself is a single mutable row with no
// history, so every membership-lifecycle moment that would otherwise get
// silently overwritten on the next status change gets logged here instead.
// Best-effort: a failed insert here doesn't fail the request that already
// succeeded — the associate row itself stays the source of truth, this
// table is a display/audit trail layered on top of it.
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
