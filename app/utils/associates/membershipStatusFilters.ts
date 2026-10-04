// app\utils\associates\membershipStatusFilters.ts
import type { Associate } from '~/types'

export interface StatusColumnFilter {
  id: string
  value: unknown
}

// The roster's `?status=` query as the column filters of its table. "pending_renewal" filters a
// different column entirely: it isn't a membership_status value but derives from
// pauperwave_associate_membership_events (see the has_pending_renewal column), so the two filters
// are mutually exclusive.
export function columnFiltersForStatus(status: unknown): StatusColumnFilter[] {
  if (status === 'pending_renewal') return [{ id: 'has_pending_renewal', value: true }]
  if (typeof status === 'string') return [{ id: 'membership_status', value: status }]
  return []
}

// No 'pending' here: the roster never contains pending requests in the first place
export function countMembershipStatuses(associates: Pick<Associate, 'membership_status'>[]) {
  const counts = { active: 0, to_renew: 0, expired: 0 }
  for (const associate of associates) {
    if (associate.membership_status in counts) {
      counts[associate.membership_status as keyof typeof counts]++
    }
  }
  return counts
}
