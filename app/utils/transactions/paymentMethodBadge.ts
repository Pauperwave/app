// app\utils\transactions\paymentMethodBadge.ts
import type { BadgeProps } from '@nuxt/ui'
import type { PaymentMethod } from '#shared/types/transactions'

interface PaymentMethodBadgeStyle {
  icon: string
  /** Theme token (app.config.ts's ui.colors), used when the method has no brand color. */
  color?: BadgeProps['color']
  /**
   * Literal brand hex (PayPal blue, Cash's "money green"): Nuxt UI's `color` prop only takes theme
   * tokens, so these are inline style overrides (see PaymentMethodBadge.vue).
   */
  hex?: string
}

// Same "single config, used inline and in a table" pattern as PAYMENT_TYPE_BADGE_CONFIG
// (paymentTypeBadge.ts), ported from league's PAYMENT_METHOD_DISPLAY (pos/cash/free) with
// PayPal/Comped added
export const PAYMENT_METHOD_BADGE_CONFIG: Record<PaymentMethod, PaymentMethodBadgeStyle> = {
  Cash: { color: 'success', icon: ICONS.wallet },
  PayPal: { color: 'info', icon: ICONS.paypal },
  POS: { color: 'primary', icon: ICONS.creditCard },
  Comped: { color: 'neutral', icon: ICONS.ticket }
}
