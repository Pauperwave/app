<!-- app\components\transactions\list\BulkActionsBar.vue -->
<!--
  Shown only while at least one transaction is selected (useSelection.ts) —
  same "dumb component, page owns the state" shape as
  TournamentsListBulkActionsBar.vue/WantedCardsListBulkActionsBar.vue,
  including the same markStatus-style dropdown pattern, applied here to
  payment_type instead of a status field.
-->
<script setup lang="ts">
import { PAYMENT_TYPES } from '#shared/types/transactions'
import type { PaymentType } from '#shared/types/transactions'

const { count, side } = defineProps<{ count: number, side: 'left' | 'right' }>()

defineEmits<{
  clear: []
  changeType: [paymentType: PaymentType]
  delete: []
}>()

const { t } = useI18n()

const typeItems = computed(() => PAYMENT_TYPES.map(type => ({
  label: t(PAYMENT_TYPE_LABEL_KEYS[type]),
  icon: PAYMENT_TYPE_BADGE_CONFIG[type].icon,
  value: type
})))
</script>

<template>
  <div v-if="side === 'left'" class="flex items-center gap-3 flex-wrap">
    <span class="text-sm text-muted">
      {{ t('transaction.bulkActions.selectedCount', count) }}
    </span>

    <UButton
      :label="t('transaction.bulkActions.clearSelection')"
      color="neutral"
      variant="ghost"
      @click="$emit('clear')"
    />
  </div>

  <div v-else class="flex items-center gap-2 flex-wrap">
    <UDropdownMenu
      :items="typeItems.map(item => ({
        label: item.label,
        icon: item.icon,
        onSelect: () => $emit('changeType', item.value)
      }))"
    >
      <UButton
        :label="t('transaction.bulkActions.changeType')"
        color="neutral"
        variant="outline"
        :trailing-icon="ICONS.chevronDown"
      />
    </UDropdownMenu>

    <UButton
      :label="t('transaction.rowActions.delete')"
      :icon="ICONS.delete"
      color="error"
      variant="outline"
      @click="$emit('delete')"
    />
  </div>
</template>
