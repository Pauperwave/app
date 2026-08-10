// app\utils\status\associateStatus.ts
import type { MembershipStatus } from '~/types'

export type MembershipStatusBadgeColor = 'success' | 'warning' | 'error' | 'neutral'

export const membershipStatusConfig: Record<
  MembershipStatus,
  { color: MembershipStatusBadgeColor, icon: string }
> = {
  active: { color: 'success', icon: 'i-lucide-check-circle' },
  to_renew: { color: 'warning', icon: 'i-lucide-refresh-cw' },
  expired: { color: 'error', icon: 'i-lucide-ban' },
  pending: { color: 'warning', icon: 'i-lucide-circle-dot-dashed' },
  rejected: { color: 'error', icon: 'i-lucide-x-circle' },
  approved: { color: 'success', icon: 'i-lucide-check-circle' }
}

export function getMembershipStatusBadge(status: MembershipStatus) {
  return membershipStatusConfig[status] ?? { color: 'neutral' as const, icon: 'i-lucide-help-circle' }
}
