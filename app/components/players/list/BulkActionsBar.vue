<!-- app\components\players\list\BulkActionsBar.vue -->
<!--
  Shown only while at least one player is selected (useSelection.ts) — same
  "dumb component, page owns the state" shape as the other domains' own
  BulkActionsBar.vue. Delete is the only bulk action here (no bulk promote:
  promoting is a per-player decision, kept in the row context menu).
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
      {{ t('player.bulkActions.selectedCount', count) }}
    </span>

    <UButton
      :label="t('player.bulkActions.clearSelection')"
      color="neutral"
      variant="ghost"
      @click="$emit('clear')"
    />
  </div>

  <div v-else class="flex items-center gap-2 flex-wrap">
    <UButton
      :label="withCount(t('player.rowActions.delete'), count)"
      :icon="ICONS.delete"
      color="error"
      variant="outline"
      @click="$emit('delete')"
    />
  </div>
</template>
