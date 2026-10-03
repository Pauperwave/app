// app\utils\transactions\paymentTypeBadge.ts
import type { BadgeProps } from '@nuxt/ui'
import type { PaymentType } from '#shared/types/transactions'

// Shared by useTransactionsTableColumns.ts's payment_type column and associate/[slug].vue's
// embedded table ("single config, used inline and in a table", like MEMBERSHIP_STATUS_BADGE_CONFIG)
export const PAYMENT_TYPE_BADGE_CONFIG: Record<PaymentType, { color: BadgeProps['color'], icon: string }> = {
  'Association Fee': { color: 'primary', icon: ICONS.players },
  'Tournament Fee': { color: 'secondary', icon: ICONS.battle },
  'Event Fee': { color: 'warning', icon: ICONS.calendar },
  'Donation': { color: 'neutral', icon: ICONS.heartHandshake },
  // Buying tokens to spend inside an event (Commanderwave Fest), not a fee for the event itself;
  // same icon as the "Gettoni" column (transactionGettoni.ts)
  'Token Purchase': { color: 'info', icon: ICONS.coins }
}

// Shared by PaymentTypeBadge.vue and BulkActionsBar.vue's type-change dropdown: the Add/Edit form's
// transaction.addModal.paymentTypeOptions i18n keys, so all three show the same label
export const PAYMENT_TYPE_LABEL_KEYS: Record<PaymentType, string> = {
  'Association Fee': 'transaction.addModal.paymentTypeOptions.membership',
  'Tournament Fee': 'transaction.addModal.paymentTypeOptions.entryFee',
  'Event Fee': 'transaction.addModal.paymentTypeOptions.eventFee',
  'Donation': 'transaction.addModal.paymentTypeOptions.donation',
  'Token Purchase': 'transaction.addModal.paymentTypeOptions.tokenPurchase'
}
