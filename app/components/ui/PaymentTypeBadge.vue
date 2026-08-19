<!-- app\components\ui\PaymentTypeBadge.vue -->
<!--
  Extracted 2026-08-19 out of useTransactionsTableColumns.ts's payment_type
  cell, duplicated verbatim in associate/[slug].vue's embedded transactions
  table the moment it was written — same PAYMENT_TYPE_BADGE_CONFIG lookup,
  same h(UBadge, ...) call, in two places.
-->
<script setup lang="ts">
import type { PaymentType } from '#shared/types/transactions'

const { type } = defineProps<{ type: PaymentType }>()

const badge = computed(() => PAYMENT_TYPE_BADGE_CONFIG[type] ?? { color: 'neutral' as const, icon: ICONS.help })
</script>

<template>
  <UBadge
    variant="subtle"
    v-bind="badge"
    :label="type"
  />
</template>
