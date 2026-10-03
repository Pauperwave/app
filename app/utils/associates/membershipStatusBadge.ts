// app\utils\associates\membershipStatusBadge.ts
import type { BadgeProps } from '@nuxt/ui'
import type { MembershipStatus } from '~/types'

// Shared by associates/index.vue's membership_status column and associate/[slug].vue's badge: the
// same derived (not stored, ADR-001) values. Keyed by the full MembershipStatus, 'approved'
// included though it always resolves further into active/to_renew/expired/unpaid: exhaustive on
// purpose, so every access is statically safe without non-null assertions or fallbacks at call
// sites.
export const MEMBERSHIP_STATUS_BADGE_CONFIG: Record<
  MembershipStatus, { color: BadgeProps['color'], icon: string }
> = {
  active: { color: 'success', icon: ICONS.success },
  to_renew: { color: 'warning', icon: ICONS.refresh },
  expired: { color: 'error', icon: ICONS.banned },
  // Approved but zero renewal rows ever: just submitted /tesseramento, not a lapsed membership
  unpaid: { color: 'neutral', icon: ICONS.receipt },
  pending: { color: 'warning', icon: ICONS.pending },
  rejected: { color: 'error', icon: ICONS.statusRejected },
  // Never displayed (see above): present only to keep this Record exhaustive
  approved: { color: 'neutral', icon: ICONS.help }
}
