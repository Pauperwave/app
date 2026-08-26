// app\utils\transactions\renewalKindBadge.ts
import type { BadgeProps } from '@nuxt/ui'
import type { Transaction } from '~/types'

// Single source of truth for the 'unlinked' error state below — shared by
// useTransactionsTableColumns.ts's renewalKind column and
// useTransactionsFilters.ts's "Da sistemare" tab, so the tab's count always
// matches exactly what the badge flags.
export function hasMissingAssociateError(transaction: Transaction): boolean {
  return transaction.payment_type === 'Association Fee' && !transaction.associate
}

// A Tournament/Event/Token Purchase payment with no associate_uuid — nobody
// is supposed to play/attend without being an associate, so this is a real
// policy gap, not an expected "anonymous guest" case (confirmed live:
// payments at Commanderwave Fest 2026-05-30 and Pauper 5ª tappa 2026-06-18,
// 17 in total, none traceable any further in .scratch — no email, no tax
// code, nothing beyond a name — user request, 2026-08-27). Donation
// deliberately excluded: an outside, non-member donor is normal, not a gap.
const PARTICIPATION_TYPES = ['Tournament Fee', 'Event Fee', 'Token Purchase']
export function isUnregisteredParticipant(transaction: Transaction): boolean {
  return PARTICIPATION_TYPES.includes(transaction.payment_type) && !transaction.associate
}

// 'unlinked': an Association Fee payment with no associate_uuid at all —
// can't tell new vs. renewal without knowing who paid, and the payment
// itself is a data gap worth flagging rather than leaving the cell blank
// (confirmed live: payments #694/#537, both from the 2026-08-12 historical
// import, need someone to manually match them to an associate — user
// request, 2026-08-27).
// 'guest': see isUnregisteredParticipant above.
export type RenewalKind = 'new' | 'renewal' | 'unlinked' | 'guest'

// Shared by RenewalKindBadge.vue's own cell and useTransactionsTableColumns.ts
// — same "single config" pattern as PAYMENT_TYPE_BADGE_CONFIG
// (paymentTypeBadge.ts). primary matches Association Fee's own badge color
// (a renewal IS an association fee), success is distinct from every
// payment_type color so a first-time signup stands out. warning (not error,
// unlike unlinked) since this isn't a data-entry mistake to fix in the
// app — it needs a human who was there to identify the person (user
// request, 2026-08-27).
export const RENEWAL_KIND_BADGE_CONFIG: Record<RenewalKind, { color: BadgeProps['color'], icon: string }> = {
  new: { color: 'success', icon: ICONS.addPlayer },
  renewal: { color: 'primary', icon: ICONS.calendarRenew },
  unlinked: { color: 'error', icon: ICONS.warning },
  guest: { color: 'warning', icon: ICONS.incognito }
}
