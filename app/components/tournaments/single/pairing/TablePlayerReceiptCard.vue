<!-- app\components\tournaments\single\pairing\TablePlayerReceiptCard.vue -->
<!--
  Per-player score breakdown — ported from MagicTheGathering/league (user
  request, 2026-09-15).
-->
<script setup lang="ts">
import type { TablePlayer } from '~/types'
import type { PairingPlayerScore } from '~/composables/tournaments/pairing/pairingOptimizer'

defineProps<{
  player: TablePlayer
  detail?: PairingPlayerScore
  /** Cumulative "sat at a 3-player table" count from history — shown as
   * context, separate from `detail.rotateTable3` (the weighted cost paid
   * at THIS table only, 0 for any 4-player table by design). */
  table3Count: number
}>()

const { t } = useI18n()

function formatScore(value: number): string {
  return value.toFixed(2)
}
</script>

<template>
  <div class="rounded border border-default/70 bg-muted/10 p-3 space-y-2">
    <div class="flex items-start justify-between gap-2 border-b border-default/60 pb-1.5">
      <div class="font-medium leading-tight">
        {{ player.label }}
      </div>
    </div>

    <div v-if="detail" class="space-y-1 text-xs">
      <div class="flex items-center justify-between gap-2">
        <span class="text-muted">{{ t('tournament.single.tablePreview.scoreBreakdown.strengthBalance') }}</span>
        <span class="font-mono">{{ formatScore(detail.strengthBalance) }}</span>
      </div>
      <div class="flex items-center justify-between gap-2">
        <span class="text-muted">{{ t('tournament.single.tablePreview.scoreBreakdown.novelty') }}</span>
        <span class="font-mono">{{ formatScore(detail.novelty) }}</span>
      </div>
      <div class="flex items-center justify-between gap-2">
        <span class="text-muted">{{ t('tournament.single.tablePreview.scoreBreakdown.rematch') }}</span>
        <span class="font-mono">{{ formatScore(detail.rematchPenalty) }}</span>
      </div>
      <div class="flex items-center justify-between gap-2">
        <UTooltip
          :content="{ side: 'top' }"
          :text="t('tournament.single.tablePreview.scoreBreakdown.rotateTable3Tooltip')"
        >
          <span class="text-muted underline decoration-dotted decoration-muted cursor-help">
            {{ t('tournament.single.tablePreview.weightLabels.rotateTable3') }}
          </span>
        </UTooltip>
        <span class="font-mono">{{ formatScore(detail.rotateTable3) }}</span>
      </div>
      <div class="flex items-center justify-between gap-2 text-muted/70">
        <UTooltip
          :content="{ side: 'top' }"
          :text="t('tournament.single.tablePreview.scoreBreakdown.table3CountHistoryTooltip')"
        >
          <span class="underline decoration-dotted decoration-muted/50 cursor-help">
            {{ t('tournament.single.tablePreview.scoreBreakdown.table3CountHistory') }}
          </span>
        </UTooltip>
        <span class="font-mono">{{ table3Count }}</span>
      </div>
      <div class="flex items-center justify-between gap-2 border-b border-dashed border-default/60 pb-1">
        <span class="text-muted">{{ t('tournament.single.tablePreview.scoreBreakdown.tableSizeWeight') }}</span>
        <span class="font-mono">{{ formatScore(detail.tableSizeWeight) }}</span>
      </div>
      <div class="flex items-center justify-between gap-2 font-semibold">
        <span>{{ t('tournament.single.tablePreview.scoreBreakdown.playerTotal') }}</span>
        <span class="font-mono">{{ formatScore(detail.total) }}</span>
      </div>
    </div>
  </div>
</template>
