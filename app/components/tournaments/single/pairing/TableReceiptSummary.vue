<!-- app\components\tournaments\single\pairing\TableReceiptSummary.vue -->
<!--
  Table-level score breakdown — ported from MagicTheGathering/league (user
  request, 2026-09-15).
-->
<script setup lang="ts">
import type { PairingTableScore } from '~/composables/tournaments/pairing/pairingOptimizer'

defineProps<{
  score: PairingTableScore
}>()

const { t } = useI18n()

function formatScore(value: number): string {
  return value.toFixed(2)
}
</script>

<template>
  <div class="rounded border border-default/70 bg-muted/20 p-3 space-y-1 text-xs">
    <div class="flex items-center justify-between gap-2">
      <span class="text-muted">{{ t('tournament.single.tablePreview.scoreBreakdown.strengthBalance') }}</span>
      <span class="font-mono">{{ formatScore(score.strengthBalance) }}</span>
    </div>
    <div class="flex items-center justify-between gap-2">
      <span class="text-muted">{{ t('tournament.single.tablePreview.scoreBreakdown.novelty') }}</span>
      <span class="font-mono">{{ formatScore(score.novelty) }}</span>
    </div>
    <div class="flex items-center justify-between gap-2">
      <span class="text-muted">{{ t('tournament.single.tablePreview.scoreBreakdown.rematch') }}</span>
      <span class="font-mono">{{ formatScore(score.rematchPenalty) }}</span>
    </div>
    <div class="flex items-center justify-between gap-2">
      <span class="text-muted">{{ t('tournament.single.tablePreview.weightLabels.rotateTable3') }}</span>
      <span class="font-mono">{{ formatScore(score.rotateTable3) }}</span>
    </div>
    <div class="flex items-center justify-between gap-2 border-b border-dashed border-default/60 pb-1">
      <span class="text-muted">{{ t('tournament.single.tablePreview.scoreBreakdown.tableSizeWeight') }}</span>
      <span class="font-mono">{{ formatScore(score.tableSizeWeight) }}</span>
    </div>
    <div class="flex items-center justify-between gap-2 font-semibold text-sm">
      <span>{{ t('tournament.single.tablePreview.scoreBreakdown.tableTotal') }}</span>
      <span class="font-mono">{{ formatScore(score.total) }}</span>
    </div>
  </div>
</template>
