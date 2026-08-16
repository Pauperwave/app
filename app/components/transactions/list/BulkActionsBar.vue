<!-- app\components\transactions\list\BulkActionsBar.vue -->
<!--
  Shown only while at least one transaction is selected (useSelection.ts) —
  same "dumb component, page owns the state" shape as
  TournamentsListBulkActionsBar.vue/WantedCardsListBulkActionsBar.vue, minus
  the status-change dropdown those have: a payment has no status field to
  bulk-change, only delete applies here.
-->
<script setup lang="ts">
const { count, side } = defineProps<{ count: number, side: 'left' | 'right' }>()

defineEmits<{
  clear: []
  delete: []
}>()

const { t } = useI18n()
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
    <UButton
      :label="t('transaction.rowActions.delete')"
      :icon="ICONS.delete"
      color="error"
      variant="outline"
      @click="$emit('delete')"
    />
  </div>
</template>
