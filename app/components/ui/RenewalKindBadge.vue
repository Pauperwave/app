<!-- app\components\ui\RenewalKindBadge.vue -->
<!-- Same "single config, used inline and in a table" pattern as
PaymentTypeBadge.vue — extracted straight away this time instead of
duplicating h(UBadge, ...) in useTransactionsTableColumns.ts's cell. -->
<script setup lang="ts">
import type { RenewalKind } from '~/utils/transactions/renewalKindBadge'

const { kind } = defineProps<{ kind: RenewalKind }>()
const { t } = useI18n()

const badge = computed(() => RENEWAL_KIND_BADGE_CONFIG[kind])
const label = computed(() => t(`transaction.renewalKind.${kind}`))
const hasTooltip = computed(() => kind === 'unlinked' || kind === 'guest')
</script>

<template>
  <UTooltip v-if="hasTooltip" :text="t(`transaction.renewalKind.${kind}Tooltip`)">
    <UBadge
      variant="subtle"
      v-bind="badge"
      :label="label"
    />
  </UTooltip>
  <UBadge
    v-else
    variant="subtle"
    v-bind="badge"
    :label="label"
  />
</template>
