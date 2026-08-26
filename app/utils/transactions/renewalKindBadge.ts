// app\utils\transactions\renewalKindBadge.ts
import type { BadgeProps } from '@nuxt/ui'

// 'unlinked': an Association Fee payment with no associate_uuid at all —
// can't tell new vs. renewal without knowing who paid, and the payment
// itself is a data gap worth flagging rather than leaving the cell blank
// (confirmed live: payments #694/#537, both from the 2026-08-12 historical
// import, need someone to manually match them to an associate — user
// request, 2026-08-27).
export type RenewalKind = 'new' | 'renewal' | 'unlinked'

// Shared by RenewalKindBadge.vue's own cell and useTransactionsTableColumns.ts
// — same "single config" pattern as PAYMENT_TYPE_BADGE_CONFIG
// (paymentTypeBadge.ts). primary matches Association Fee's own badge color
// (a renewal IS an association fee), success is distinct from every
// payment_type color so a first-time signup stands out (user request,
// 2026-08-27).
export const RENEWAL_KIND_BADGE_CONFIG: Record<RenewalKind, { color: BadgeProps['color'], icon: string }> = {
  new: { color: 'success', icon: ICONS.addPlayer },
  renewal: { color: 'primary', icon: ICONS.calendarRenew },
  unlinked: { color: 'error', icon: ICONS.warning }
}
