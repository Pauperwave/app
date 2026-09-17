<!-- app\components\tournaments\single\pairing\TablePreviewGrid.vue -->
<!--
  Responsive grid of TableCards — ported from MagicTheGathering/league
  (user request, 2026-09-15).
-->
<script setup lang="ts">
import type { Seat, PairingTable } from '~/types'
import type { TableStatus } from '~/composables/tournaments/pairing/useTablePairingDnd'

const { tables } = defineProps<{
  tables: PairingTable[]
  isDragging: boolean
  getTableCardClass: (table: PairingTable) => string
  getTableStatus: (table: PairingTable) => TableStatus
  getTableScore: (tableIndex: number) => number
}>()

const emit = defineEmits<{
  updateSeats: [tableIndex: number, seats: Seat[]]
  dragStart: []
  dragEnd: []
  openBreakdown: [tableIndex: number]
}>()

const gridCols = computed(() => (tables.length <= 1 ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-2'))
</script>

<template>
  <div :class="['grid gap-3', gridCols]">
    <TournamentsSinglePairingTableCard
      v-for="(table, tableIndex) in tables"
      :key="table.id"
      :table="table"
      :table-index="tableIndex"
      :is-dragging="isDragging"
      :table-card-class="getTableCardClass(table)"
      :table-status="getTableStatus(table)"
      :table-score="getTableScore(tableIndex)"
      @update-seats="(index, seats) => emit('updateSeats', index, seats)"
      @drag-start="emit('dragStart')"
      @drag-end="emit('dragEnd')"
      @open-breakdown="index => emit('openBreakdown', index)"
    />
  </div>
</template>
