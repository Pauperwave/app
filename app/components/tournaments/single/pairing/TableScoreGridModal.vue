<!-- app\components\tournaments\single\pairing\TableScoreGridModal.vue -->
<!--
  Drag-and-drop dense-rank placement entry for one pod — ported from
  MagicTheGathering/league's TableScoreGrid.vue (user request, 2026-09-15/16:
  copy the score-entry logic as-is), rebuilt on VueDraggable instead of
  league's native HTML5 drag events (see useCommanderRankingGrid.ts's own
  comment for why/how the column-constrained grid became row-based lists).
-->
<script setup lang="ts">
import type { TablePlayer } from '~/types'

const open = defineModel<boolean>('open', { default: false })

const { players, savedPositions = null, loading = false } = defineProps<{
  players: TablePlayer[]
  /** Existing placements, if this pod's ranking has already been saved once. */
  savedPositions?: Map<string, number> | null
  loading?: boolean
}>()

const emit = defineEmits<{
  confirm: [ranking: { playerUuid: string, position: number }[]]
}>()

const { t } = useI18n()

const {
  rows, rankRange, isValidFormation, initializeGrid, updateRow, getRanking
}
  = useCommanderRankingGrid(() => players)

watch(open, (isOpen) => {
  if (isOpen) initializeGrid(savedPositions)
})

function handleConfirm() {
  if (!isValidFormation.value) return
  emit('confirm', getRanking())
}
</script>

<template>
  <UModal
    v-model:open="open"
    :title="t('tournament.single.scoreGrid.title')"
    :description="t('tournament.single.scoreGrid.description')"
    :ui="{ content: 'sm:max-w-2xl' }"
  >
    <template #body>
      <div class="space-y-2">
        <div
          v-for="rank in rankRange"
          :key="`rank-${rank}`"
          class="flex items-center gap-3"
        >
          <span class="w-6 shrink-0 text-right text-xl font-bold text-muted">{{ rank + 1 }}</span>

          <VueDraggable
            :model-value="rows[rank] ?? []"
            tag="div"
            class="flex flex-1 flex-wrap gap-2 min-h-12 rounded-md border border-dashed border-default/70 bg-muted/20 p-2"
            :group="{ name: 'commander-ranking', pull: true, put: true }"
            handle=".drag-handle"
            :animation="180"
            @update:model-value="(value: TablePlayer[]) => updateRow(rank, value)"
          >
            <div
              v-for="player in (rows[rank] ?? [])"
              :key="player.value"
              class="flex items-center gap-1.5 rounded-md border border-default bg-default px-2 py-1.5"
            >
              <UIcon
                :name="ICONS.dragHandle"
                class="drag-handle size-4 text-muted cursor-grab active:cursor-grabbing"
              />
              <span class="text-sm truncate">{{ player.label }}</span>
            </div>
          </VueDraggable>
        </div>
      </div>
    </template>

    <template #footer>
      <UButton
        :label="t('common.confirm')"
        :disabled="!isValidFormation"
        :loading="loading"
        @click="handleConfirm"
      />
    </template>
  </UModal>
</template>
