// app\utils\transactions\paymentMethodBadge.ts
import type { BadgeProps } from '@nuxt/ui'
import type { PaymentMethod } from '#shared/types/transactions'

interface PaymentMethodBadgeStyle {
  icon: string
  /** Theme token (app.config.ts's ui.colors) — used when the method has no
   * brand color of its own. */
  color?: BadgeProps['color']
  /** Literal brand hex (PayPal blue, Cash's "money green") — Nuxt UI's
   * `color` prop only accepts theme tokens, so these are applied as inline
   * style overrides instead (see PaymentMethodBadge.vue). */
  hex?: string
}

// Same "single config, used inline and in a table" pattern as
// PAYMENT_TYPE_BADGE_CONFIG (paymentTypeBadge.ts) — ported from the league
// project's PAYMENT_METHOD_DISPLAY (app/utils/paymentMethod.ts), which only
// covered pos/cash/free; PayPal/Comped added here for this app's own methods.
export const PAYMENT_METHOD_BADGE_CONFIG: Record<PaymentMethod, PaymentMethodBadgeStyle> = {
  Cash: { color: 'success', icon: ICONS.wallet },
  PayPal: { color: 'info', icon: 'i-simple-icons-paypal' },
  POS: { color: 'primary', icon: ICONS.creditCard },
  Comped: { color: 'neutral', icon: ICONS.heartHandshake }
}
