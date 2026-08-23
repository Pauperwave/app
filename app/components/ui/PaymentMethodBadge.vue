<!-- app\components\ui\PaymentMethodBadge.vue -->
<!--
  Same shape as PaymentTypeBadge.vue (icon/color from a lookup config,
  rendered as a UBadge) — icon/color config ported from the league project's
  payment-method badge (app/utils/paymentMethod.ts's PAYMENT_METHOD_DISPLAY +
  useTableUtils.ts's paymentMethodCell), label translated via the same
  transaction.addModal.paymentMethodOptions i18n keys the Add/Edit form uses
  (PayPal/POS stay as-is — brand name / acronym, not translated).
-->
<script setup lang="ts">
import type { PaymentMethod } from '#shared/types/transactions'

const { method } = defineProps<{ method: PaymentMethod }>()
const { t } = useI18n()

const badge = computed(() => PAYMENT_METHOD_BADGE_CONFIG[method] ?? { color: 'neutral' as const, icon: ICONS.help })

// PayPal/Cash carry a brand hex instead of a theme token (see
// paymentMethodBadge.ts) — Nuxt UI's `color` prop can't render an arbitrary
// hex, so it's applied as an inline style instead, approximating the same
// "subtle" look (tinted background + matching text/ring) the theme-token
// badges get from the `color` prop.
const hexStyle = computed(() => {
  const hex = badge.value.hex
  if (!hex) return undefined
  return {
    backgroundColor: `${hex}1A`,
    color: hex,
    boxShadow: `inset 0 0 0 1px ${hex}40`
  }
})

const labelKeys: Record<PaymentMethod, string | null> = {
  Cash: 'transaction.addModal.paymentMethodOptions.cash',
  PayPal: null,
  POS: null,
  Comped: 'transaction.addModal.paymentMethodOptions.comped'
}
const label = computed(() => {
  const key = labelKeys[method]
  return key ? t(key) : method
})
</script>

<template>
  <UBadge
    variant="subtle"
    :color="badge.color"
    :icon="badge.icon"
    :label="label"
    :style="hexStyle"
  />
</template>
