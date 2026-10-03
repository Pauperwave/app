// app\utils\transactions\renewalKindBadge.ts
import type { BadgeProps } from '@nuxt/ui'
import type { Transaction } from '~/types'

// Single source of truth for the 'unlinked' error state, shared by useTransactionsTableColumns.ts's
// renewalKind column and useTransactionsFilters.ts's "Da sistemare" tab, so the tab's count matches
// what the badge flags
export function hasMissingAssociateError(transaction: Transaction): boolean {
  return transaction.payment_type === 'Association Fee' && !transaction.associate
}

// A Tournament/Event/Token Purchase payment with no associate_uuid: nobody should play/attend
// without being an associate, so this is a policy gap, not an expected anonymous guest. Donation is
// excluded: an outside donor is normal.
const PARTICIPATION_TYPES = ['Tournament Fee', 'Event Fee', 'Token Purchase']
export function isUnregisteredParticipant(transaction: Transaction): boolean {
  return PARTICIPATION_TYPES.includes(transaction.payment_type) && !transaction.associate
}

// 'unlinked': an Association Fee payment with no associate_uuid: new vs renewal can't be told, and
// it's a data gap worth flagging rather than a blank cell. 'guest': see PARTICIPATION_TYPES above.
export type RenewalKind = 'new' | 'renewal' | 'unlinked' | 'guest'

// Shared by RenewalKindBadge.vue and useTransactionsTableColumns.ts (same "single config" pattern
// as PAYMENT_TYPE_BADGE_CONFIG). primary matches Association Fee's badge (a renewal IS an
// association fee); success makes a first signup stand out; warning (not error like unlinked) since
// a human who was there has to identify the person, not a data-entry fix
export const RENEWAL_KIND_BADGE_CONFIG: Record<RenewalKind, { color: BadgeProps['color'], icon: string }> = {
  new: { color: 'success', icon: ICONS.addPlayer },
  renewal: { color: 'primary', icon: ICONS.calendarRenew },
  unlinked: { color: 'error', icon: ICONS.warning },
  guest: { color: 'warning', icon: ICONS.incognito }
}
