<!-- app\components\tournaments\list\BulkActionsBar.vue -->
<!--
  Shown only while at least one tournament is selected (useSelection.ts) —
  shared between the table and grid views, which both feed the same
  selection. Same shape/reasoning as WantedCardsListBulkActionsBar.vue,
  including the "swap, don't insert a row" trick — see that file's header
  comment.
-->
<script setup lang="ts">
import type { TournamentStatus } from '~/types'

const { count, side } = defineProps<{ count: number, side: 'left' | 'right' }>()

defineEmits<{
  clear: []
  markStatus: [status: TournamentStatus]
  delete: []
}>()

const { t } = useI18n()

const statusItems = computed(() => TOURNAMENT_STATUSES.map(status => ({
  label: t(`tournament.status.${status}`),
  icon: TOURNAMENT_STATUS_ICONS[status],
  value: status
})))
</script>

<template>
  <div v-if="side === 'left'" class="flex items-center gap-3 flex-wrap">
    <span class="text-sm text-muted">
      {{ t('tournament.bulkActions.selectedCount', count) }}
    </span>

    <UButton
      :label="t('tournament.bulkActions.clearSelection')"
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
        :label="t('tournament.bulkActions.markAs')"
        color="neutral"
        variant="outline"
        :trailing-icon="ICONS.chevronDown"
      />
    </UDropdownMenu>

    <UButton
      :label="t('tournament.rowActions.delete')"
      :icon="ICONS.delete"
      color="error"
      variant="outline"
      @click="$emit('delete')"
    />
  </div>
</template>
