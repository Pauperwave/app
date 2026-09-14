<!-- app\components\tournaments\single\pairing\TableCard.vue -->
<!--
  One pod's card in the preview grid — ported from
  MagicTheGathering/league's TableCard.vue (user request, 2026-09-15).
  Drag-and-drop already used vue-draggable-plus in league itself, matching
  this app's own DnD convention (PodsManager.vue) — no rebuild needed here.
-->
<script setup lang="ts">
import type { Seat, PairingTable } from '~/types'
import type { TableStatus } from '~/composables/tournaments/useTablePairingDnd'
import { VueDraggable } from 'vue-draggable-plus'

const { t } = useI18n()

const props = defineProps<{
  table: PairingTable
  tableIndex: number
  isDragging: boolean
  tableCardClass: string
  tableStatus: TableStatus
  tableScore: number
}>()

const emit = defineEmits<{
  updateSeats: [tableIndex: number, seats: Seat[]]
  dragStart: []
  dragEnd: []
  openBreakdown: [tableIndex: number]
}>()

// Rendered directly in the template's v-for below — vue-draggable-plus
// requires the v-model source and the rendered list to be the exact same
// array; a separately-derived list (e.g. filtering out player-less seats
// once "full") desyncs cross-table drag-and-drop (see
// useTablePairingDnd.ts's updateTableSeats doc comment).
const seatsModel = computed({
  get: () => props.table.seats,
  set: (nextSeats: Seat[]) => emit('updateSeats', props.tableIndex, nextSeats)
})
</script>

<template>
  <UCard
    :class="tableCardClass"
    :ui="{ header: 'px-2 py-1.5 sm:px-2 sm:py-1.5', body: 'px-2 py-2 sm:px-2 sm:py-2' }"
  >
    <template #header>
      <div class="flex items-center justify-between gap-2">
        <div class="flex items-center gap-2">
          <UIcon :name="ICONS.tableView" class="size-4 text-primary" />
          <span class="font-semibold text-base whitespace-nowrap">
            {{ t('tournament.single.tablePreview.tableHeading', { n: table.tableNumber }) }}
          </span>
        </div>
        <div class="flex items-center gap-1.5">
          <UButton
            size="xs"
            color="neutral"
            variant="soft"
            :icon="ICONS.show"
            @click="emit('openBreakdown', tableIndex)"
          >
            {{ t('tournament.single.tablePreview.scoreLabel', { score: tableScore.toFixed(2) }) }}
          </UButton>
          <UBadge
            :color="tableStatus.color"
            variant="soft"
            size="sm"
            class="text-base font-semibold leading-none whitespace-nowrap"
          >
            {{ tableStatus.label }}
          </UBadge>
        </div>
      </div>
    </template>

    <div class="@container">
      <VueDraggable
        v-model="seatsModel"
        tag="div"
        class="grid grid-cols-1 @md:grid-cols-2 gap-2"
        :group="{ name: 'pairing-seats', pull: true, put: true }"
        handle=".drag-handle"
        :animation="180"
        ghost-class="!opacity-0"
        chosen-class="scale-95"
        @start="emit('dragStart')"
        @end="emit('dragEnd')"
      >
        <TournamentsSinglePairingTableSeatItem
          v-for="seat in seatsModel"
          :key="seat.id"
          :seat="seat"
          :is-dragging="isDragging"
        />
      </VueDraggable>
    </div>
  </UCard>
</template>
