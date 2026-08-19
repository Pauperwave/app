// app\utils\transactions\paymentTypeBadge.ts
import type { BadgeProps } from '@nuxt/ui'
import type { PaymentType } from '#shared/types/transactions'

// Shared by useTransactionsTableColumns.ts's payment_type column and
// associate/[slug].vue's embedded per-associate transactions table (same
// "single config, used inline and in a table" pattern as
// MEMBERSHIP_STATUS_BADGE_CONFIG, membershipStatusBadge.ts).
export const PAYMENT_TYPE_BADGE_CONFIG: Record<PaymentType, { color: BadgeProps['color'], icon: string }> = {
  'Association Fee': { color: 'primary', icon: ICONS.players },
  'Tournament Fee': { color: 'success', icon: ICONS.standings },
  'Event Fee': { color: 'warning', icon: ICONS.calendar },
  'Donation': { color: 'neutral', icon: ICONS.heartHandshake }
}
