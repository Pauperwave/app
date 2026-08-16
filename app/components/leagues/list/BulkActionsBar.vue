<!-- app\components\leagues\list\BulkActionsBar.vue -->
<!--
  Shown only while at least one league is selected (useSelection.ts) — shared
  between the table and grid views, which both feed the same selection. Same
  shape/reasoning as TournamentsListBulkActionsBar.vue, including the "swap,
  don't insert a row" trick — see that file's header comment.
-->
<script setup lang="ts">
import type { LeagueStatus } from '~/types'

const { count, side } = defineProps<{ count: number, side: 'left' | 'right' }>()

defineEmits<{
  clear: []
  markStatus: [status: LeagueStatus]
  delete: []
}>()

const { t } = useI18n()

const statusItems = computed(() => LEAGUE_STATUSES.map(status => ({
  label: t(`league.status.${status}`),
  icon: LEAGUE_STATUS_ICONS[status],
  value: status
})))
</script>

<template>
  <div v-if="side === 'left'" class="flex items-center gap-3 flex-wrap">
    <span class="text-sm text-muted">
      {{ t('league.bulkActions.selectedCount', count) }}
    </span>

    <UButton
      :label="t('league.bulkActions.clearSelection')"
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
        :label="t('league.bulkActions.markAs')"
        color="neutral"
        variant="outline"
        :trailing-icon="ICONS.chevronDown"
      />
    </UDropdownMenu>

    <UButton
      :label="t('league.rowActions.delete')"
      :icon="ICONS.delete"
      color="error"
      variant="outline"
      @click="$emit('delete')"
    />
  </div>
</template>
