// app\utils\associates\membershipStatusBadge.ts
import type { BadgeProps } from '@nuxt/ui'
import type { MembershipStatus } from '~/types'

// Shared by associates/index.vue's membership_status column and
// associate/[slug].vue's status badge (fallow dupes, 2026-08-12) — same
// derived (not stored, see PROGRESS.md ADR-001) membership_status values
// everywhere. Keyed by the full MembershipStatus, 'approved' included, even
// though an approved membership request always resolves further into
// active/to_renew/expired/unpaid and 'approved' never actually reaches this
// lookup — exhaustive on purpose (2026-08-24) so every access is statically
// known-safe (no non-null assertions or Record<string, ...> escape hatch at
// call sites), same reasoning MembershipStatusBadge.vue/AssociateTag.vue's
// own now-redundant `?? { neutral, help }` fallback used to paper over.
export const MEMBERSHIP_STATUS_BADGE_CONFIG: Record<
  MembershipStatus, { color: BadgeProps['color'], icon: string }
> = {
  active: { color: 'success', icon: ICONS.success },
  to_renew: { color: 'warning', icon: ICONS.refresh },
  expired: { color: 'error', icon: ICONS.banned },
  // Approved but zero renewal rows ever — just submitted /tesseramento, not a
  // lapsed membership (distinguished from 'expired' 2026-08-18).
  unpaid: { color: 'neutral', icon: ICONS.receipt },
  pending: { color: 'warning', icon: ICONS.pending },
  rejected: { color: 'error', icon: ICONS.statusRejected },
  // Never actually displayed (see above) — present only so this Record is
  // exhaustive over MembershipStatus.
  approved: { color: 'neutral', icon: ICONS.help }
}
