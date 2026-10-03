<!-- app\components\tournaments\single\pairing\TableScoreBreakdownModal.vue -->
<!-- Read-only per-table score breakdown, opened from a TableCard's score button, ported from
     league. It shares the PairingTableScore/PairingPlayerScore the optimizer produces, so the
     numbers can't drift from what was optimized for. -->
<script setup lang="ts">
import type { TablePlayer } from '~/types'
import type { PairingPlayerScore, PairingTableScore } from '~/composables/tournaments/pairing/pairingOptimizer'

interface PlayerRow {
  player: TablePlayer
  detail?: PairingPlayerScore
  table3Count: number
}

defineProps<{
  selectedTableScore: PairingTableScore | null
  selectedTablePlayerRows: PlayerRow[]
}>()

const open = defineModel<boolean>('open', { default: false })

const { t } = useI18n()
</script>

<template>
  <UModal
    v-model:open="open"
    :title="t('tournament.single.tablePreview.scoreBreakdown.modalTitle')"
    :ui="{ content: 'sm:max-w-2xl' }"
  >
    <template #body>
      <div v-if="selectedTableScore" class="space-y-4">
        <TournamentsSinglePairingTableReceiptSummary :score="selectedTableScore" />

        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <TournamentsSinglePairingTablePlayerReceiptCard
            v-for="row in selectedTablePlayerRows"
            :key="row.player.value"
            :player="row.player"
            :detail="row.detail"
            :table3-count="row.table3Count"
          />
        </div>
      </div>

      <div v-else class="text-sm text-muted">
        {{ t('tournament.single.tablePreview.scoreBreakdown.noDetails') }}
      </div>
    </template>
  </UModal>
</template>
