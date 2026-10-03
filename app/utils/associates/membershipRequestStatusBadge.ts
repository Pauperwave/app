// app\utils\associates\membershipRequestStatusBadge.ts
import type { BadgeProps } from '@nuxt/ui'
import type { RequestStatus } from '~/types'

// Same "single config" pattern as membershipStatusBadge.ts/associateTypeBadge.ts, used by
// MembershipRequestStatusBadge.vue
export const MEMBERSHIP_REQUEST_STATUS_BADGE_CONFIG: Record<RequestStatus, { color: BadgeProps['color'], icon: string }> = {
  approved: { color: 'success', icon: ICONS.success },
  pending: { color: 'warning', icon: ICONS.pending },
  rejected: { color: 'error', icon: ICONS.statusRejected }
}
