// app\utils\status\associateStatus.ts
import type { MembershipStatus } from '~/types'

export type MembershipStatusBadgeColor = 'success' | 'warning' | 'error' | 'neutral'

export const membershipStatusConfig: Record<
  MembershipStatus,
  { color: MembershipStatusBadgeColor, icon: string }
> = {
  active: { color: 'success', icon: ICONS.success },
  to_renew: { color: 'warning', icon: ICONS.refresh },
  expired: { color: 'error', icon: ICONS.banned },
  unpaid: { color: 'neutral', icon: ICONS.creditCard },
  pending: { color: 'warning', icon: ICONS.pending },
  rejected: { color: 'error', icon: ICONS.statusRejected },
  approved: { color: 'success', icon: ICONS.success }
}

export function getMembershipStatusBadge(status: MembershipStatus) {
  return membershipStatusConfig[status] ?? { color: 'neutral' as const, icon: ICONS.help }
}
