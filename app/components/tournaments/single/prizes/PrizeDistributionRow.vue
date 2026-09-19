<!-- app\components\tournaments\single\prizes\PrizeDistributionRow.vue -->
<!--
  One placement of the prize standings: rank, player, share stepper and pack
  count. Rewarded rows have a share (buttons only, each step moves exactly one
  pack) and an editable pack count; the others only show what they receive.
-->
<script setup lang="ts">
import type { ChangeFlash } from '~/composables/useChangeFlash'

export interface PrizeDistributionRowData {
  associateUuid: string
  label: string
  packs: number
  // Fewest/most packs this placement can reach without passing a neighbour
  minPacks: number
  maxPacks: number
  // Percent of the bonus pool for this placement; null outside the rewarded ones
  sharePercent: number | null
}

const {
  row, rank, flash = undefined, muted = false
} = defineProps<{
  row: PrizeDistributionRowData
  // 0-based placement
  rank: number
  // Tint while the pack count has just changed
  flash?: ChangeFlash
  muted?: boolean
}>()

const emit = defineEmits<{
  updatePacks: [rank: number, packs: number]
  stepShare: [rank: number, direction: 1 | -1]
}>()

const { t } = useI18n()

// Shares come from whole packs, so at most one decimal (e.g. 9.1%)
function formatShare(share: number): string {
  return `${Math.round(share * 10) / 10}%`
}
</script>

<template>
  <div
    class="flex items-center gap-3 px-3 py-2 transition-colors duration-500"
    :class="{
      'opacity-60': muted,
      'bg-success/20': flash === 'gain',
      'bg-error/20': flash === 'loss'
    }"
  >
    <span class="w-8 shrink-0 text-center font-mono text-sm text-muted">
      #{{ rank + 1 }}
    </span>

    <AssociateTag
      :name="row.label"
      :associate-uuid="row.associateUuid"
      size="md"
      class="flex-1"
    />

    <ValueStepper
      v-if="row.sharePercent !== null"
      :label="formatShare(row.sharePercent)"
      :can-decrease="row.packs > row.minPacks"
      :can-increase="row.packs < row.maxPacks"
      :decrease-label="t('tournament.single.prizeDistribution.stepShareDown')"
      :increase-label="t('tournament.single.prizeDistribution.stepShareUp')"
      class="w-32"
      @decrease="emit('stepShare', rank, -1)"
      @increase="emit('stepShare', rank, 1)"
    />
    <div
      v-else
      class="w-32"
    />

    <UInputNumber
      :model-value="row.packs"
      :min="row.minPacks"
      :max="row.maxPacks"
      :disabled="row.sharePercent === null"
      class="w-28"
      :icon="ICONS.booster"
      @update:model-value="value => emit('updatePacks', rank, Number(value ?? 0))"
    />
  </div>
</template>
