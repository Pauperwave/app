<!-- app\components\events\list\BulkActionsBar.vue -->
<!--
  Shown only while at least one event is selected (useSelection.ts) — shared
  between the table and grid views, which both feed the same selection. Same
  shape/reasoning as LeaguesListBulkActionsBar.vue (status + delete only, no
  image/entry-fee actions — events has neither).
-->
<script setup lang="ts">
import type { EventStatus } from '~/types'

const { count, side } = defineProps<{ count: number, side: 'left' | 'right' }>()

defineEmits<{
  clear: []
  markStatus: [status: EventStatus]
  delete: []
}>()

const { t } = useI18n()

const statusItems = computed(() => EVENT_STATUSES.map(status => ({
  label: t(`event.status.${status}`),
  icon: EVENT_STATUS_ICONS[status],
  value: status
})))
</script>

<template>
  <div v-if="side === 'left'" class="flex items-center gap-3 flex-wrap">
    <span class="text-sm text-muted">
      {{ t('event.bulkActions.selectedCount', count) }}
    </span>

    <UButton
      :label="t('event.bulkActions.clearSelection')"
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
        :label="t('event.bulkActions.markAs')"
        color="neutral"
        variant="outline"
        :trailing-icon="ICONS.chevronDown"
      />
    </UDropdownMenu>

    <UButton
      :label="t('event.rowActions.delete')"
      :icon="ICONS.delete"
      color="error"
      variant="outline"
      @click="$emit('delete')"
    />
  </div>
</template>
