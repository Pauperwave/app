// app\utils\transactions\paymentTypeBadge.ts
import type { BadgeProps } from '@nuxt/ui'
import type { PaymentType } from '#shared/types/transactions'

// Shared by useTransactionsTableColumns.ts's payment_type column and
// associate/[slug].vue's embedded per-associate transactions table (same
// "single config, used inline and in a table" pattern as
// MEMBERSHIP_STATUS_BADGE_CONFIG, membershipStatusBadge.ts).
export const PAYMENT_TYPE_BADGE_CONFIG: Record<PaymentType, { color: BadgeProps['color'], icon: string }> = {
  'Association Fee': { color: 'primary', icon: ICONS.players },
  'Tournament Fee': { color: 'success', icon: ICONS.battle },
  'Event Fee': { color: 'warning', icon: ICONS.calendar },
  'Donation': { color: 'neutral', icon: ICONS.heartHandshake },
  // Buying tokens to spend inside an event (Commanderwave Fest today), not a
  // fee for the event itself — distinct enough from Event Fee to warrant its
  // own type (user request, 2026-08-23). Same icon as the per-row "Gettoni"
  // count column (transactionGettoni.ts).
  'Token Purchase': { color: 'info', icon: ICONS.coins }
}

// Shared by PaymentTypeBadge.vue and BulkActionsBar.vue's type-change
// dropdown — same transaction.addModal.paymentTypeOptions i18n keys the
// Add/Edit form uses, so all three show the same Italian label.
export const PAYMENT_TYPE_LABEL_KEYS: Record<PaymentType, string> = {
  'Association Fee': 'transaction.addModal.paymentTypeOptions.membership',
  'Tournament Fee': 'transaction.addModal.paymentTypeOptions.entryFee',
  'Event Fee': 'transaction.addModal.paymentTypeOptions.eventFee',
  'Donation': 'transaction.addModal.paymentTypeOptions.donation',
  'Token Purchase': 'transaction.addModal.paymentTypeOptions.tokenPurchase'
}
