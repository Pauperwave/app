// app\utils\associates\membershipStatusBadge.ts
import type { BadgeProps } from '@nuxt/ui'

// Shared by associates/index.vue's membership_status column and
// associate/[slug].vue's status badge (fallow dupes, 2026-08-12) — same
// derived (not stored, see PROGRESS.md ADR-001) membership_status values
// everywhere.
export const MEMBERSHIP_STATUS_BADGE_CONFIG: Record<string, { color: BadgeProps['color'], icon: string }> = {
  active: { color: 'success', icon: ICONS.success },
  to_renew: { color: 'warning', icon: ICONS.refresh },
  expired: { color: 'error', icon: ICONS.banned },
  pending: { color: 'warning', icon: ICONS.pending },
  rejected: { color: 'error', icon: ICONS.statusRejected }
}
