<!-- app\components\ui\PaymentTypeBadge.vue -->
<!-- Extracted from useTransactionsTableColumns.ts's payment_type cell, which
     associate/[slug].vue's embedded transactions table duplicated: the same
     PAYMENT_TYPE_BADGE_CONFIG lookup and h(UBadge, ...) call. -->
<script setup lang="ts">
import type { PaymentType } from '#shared/types/transactions'

const { type } = defineProps<{ type: PaymentType }>()
const { t } = useI18n()

const badge = computed(() => PAYMENT_TYPE_BADGE_CONFIG[type] ?? { color: 'neutral' as const, icon: ICONS.help })
const label = computed(() => t(PAYMENT_TYPE_LABEL_KEYS[type]))
</script>

<template>
  <UBadge
    variant="subtle"
    v-bind="badge"
    :label="label"
  />
</template>
