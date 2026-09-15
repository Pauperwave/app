<!-- app\components\tournaments\single\pairing\TableScoreGridModal.vue -->
<!--
  Drag-and-drop dense-rank placement entry for one pod — ported from
  MagicTheGathering/league's TableScoreGrid.vue (user request, 2026-09-17:
  copy the grid mechanic as-is, not a row-based reinterpretation). A
  size×size grid: each COLUMN is a player's fixed seat, the ROW they
  currently occupy is their rank (row 0 = 1st). Dragging only ever moves a
  token within its own column — dropping on an occupied cell swaps the two
  occupants (see useCommanderRankingGrid.ts's handleDrop). Native HTML5
  drag events, not VueDraggable/Sortable.js — Sortable has no built-in
  "confined to one column" concept, which is exactly why league itself
  uses native drag here instead of its own usual drag-and-drop library.
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
  grid, gridSize, rankRange, isDragging, draggedFromCol,
  isValidFormation, initializeGrid, handleDragStart, handleDrop, handleDragEnd, getRanking
} = useCommanderRankingGrid(() => players)

watch(open, (isOpen) => {
  if (isOpen) initializeGrid(savedPositions)
})

function handleConfirm() {
  if (!isValidFormation.value) return
  emit('confirm', getRanking())
}

// Same cell-highlight rule as league's own getCellClass: an empty cell
// lights up only while a token from its own column is mid-drag, so the
// "you can only drop back into your own lane" constraint is visible
// before you even try.
function cellClass(row: number, col: number): string {
  const base = 'h-12 rounded-md border transition-all flex items-center justify-center'
  if (grid.value[row]?.[col]) {
    return `${base} border-default bg-default`
  }
  if (isDragging.value && draggedFromCol.value === col) {
    return `${base} border-dashed border-warning bg-warning/10`
  }
  return `${base} border-dashed border-default/70 bg-muted/20`
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
          v-for="row in rankRange"
          :key="`row-${row}`"
          class="flex items-center gap-3"
        >
          <span class="w-6 shrink-0 text-right text-xl font-bold text-muted">{{ row + 1 }}</span>

          <div
            class="grid flex-1 gap-2"
            :class="gridSize === 3 ? 'grid-cols-3' : 'grid-cols-4'"
          >
            <div
              v-for="col in rankRange"
              :key="`row-${row}-col-${col}`"
              :class="cellClass(row, col)"
              @dragover.prevent
              @drop="handleDrop(row, col)"
            >
              <div
                v-if="grid[row]?.[col]"
                draggable="true"
                class="w-full h-full flex items-center justify-center px-1.5 cursor-grab active:cursor-grabbing"
                @dragstart="handleDragStart(row, col)"
                @dragend="handleDragEnd"
              >
                <span class="text-sm truncate">{{ grid[row]![col]!.label }}</span>
              </div>
            </div>
          </div>
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
