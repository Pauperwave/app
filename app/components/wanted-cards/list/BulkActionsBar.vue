<!-- app\components\wanted-cards\list\BulkActionsBar.vue -->
<!-- Shown only while at least one card is selected (useSelection.ts), shared by the table and
     grid views, which feed the same selection. A dumb component: index.vue owns the
     selection/bulk-actions state, this renders the count and triggers the callbacks it is
     given.  No own UDashboardToolbar: it is swapped into the existing filters toolbar's
     #left/#right (one `side` per instance) instead of inserting a separate row, whose
     appearing/disappearing caused a layout shift whenever the selection went from empty to
     non-empty. Same toolbar row, same height, no shift. -->
<script setup lang="ts">
import type { WantedCardStatus } from '~/types'

const { count, side } = defineProps<{ count: number, side: 'left' | 'right' }>()

defineEmits<{
  clear: []
  markStatus: [status: WantedCardStatus]
  delete: []
  copyNames: []
  refreshPrices: []
}>()

const { t } = useI18n()

const statusItems = computed(() => WANTED_CARD_STATUSES.map(status => ({
  label: t(`wantedCard.status.${status}`),
  icon: WANTED_CARD_STATUS_ICONS[status],
  value: status
})))
</script>

<template>
  <div v-if="side === 'left'" class="flex items-center gap-3 flex-wrap">
    <span class="text-sm text-muted">
      {{ t('wantedCard.bulkActions.selectedCount', count) }}
    </span>

    <UButton
      :label="t('wantedCard.bulkActions.clearSelection')"
      color="neutral"
      variant="ghost"
      @click="$emit('clear')"
    />
  </div>

  <div v-else class="flex items-center gap-2 flex-wrap">
    <UDropdownMenu
      :items="statusItems.map(item => ({
        label: item.label,
        icon: item.icon,
        onSelect: () => $emit('markStatus', item.value)
      }))"
    >
      <UButton
        :label="withCount(t('wantedCard.bulkActions.markAs'), count)"
        color="neutral"
        variant="outline"
        :trailing-icon="ICONS.chevronDown"
      />
    </UDropdownMenu>

    <UButton
      :label="withCount(t('wantedCard.bulkActions.copyNames'), count)"
      :icon="ICONS.copy"
      color="neutral"
      variant="outline"
      @click="$emit('copyNames')"
    />

    <UButton
      :label="withCount(t('wantedCard.bulkActions.refreshPrices'), count)"
      :icon="ICONS.refresh"
      color="neutral"
      variant="outline"
      @click="$emit('refreshPrices')"
    />

    <UButton
      :label="withCount(t('wantedCard.contextMenu.delete'), count)"
      :icon="ICONS.delete"
      color="error"
      variant="outline"
      @click="$emit('delete')"
    />
  </div>
</template>
