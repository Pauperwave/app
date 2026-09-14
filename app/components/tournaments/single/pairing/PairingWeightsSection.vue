<!-- app\components\tournaments\single\pairing\PairingWeightsSection.vue -->
<!--
  Weight sliders (strengthBalance/novelty/rematch/rotateTable3/tableSize4/
  tableSize3) for the pairing optimizer's settings modal — ported from
  MagicTheGathering/league (user request, 2026-09-15).
-->
<script setup lang="ts">
import type { PairingWeights } from '~/types'
import type { PairingPresetKind } from './PairingPresetButtons.vue'

interface WeightItem {
  key: keyof PairingWeights
  label: string
  value: number
  min: number
  max: number
  step: number
}

defineProps<{
  selectedPreset: PairingPresetKind
  scoreItems: ReadonlyArray<WeightItem>
}>()

const emit = defineEmits<{
  selectPreset: [preset: Exclude<PairingPresetKind, 'custom'>]
  updateWeight: [key: keyof PairingWeights, value: number]
}>()

const { t } = useI18n()
</script>

<template>
  <section class="space-y-3">
    <div class="text-sm font-semibold">
      {{ t('tournament.single.tablePreview.weights.heading') }}
    </div>

    <TournamentsSinglePairingPresetButtons
      :selected="selectedPreset"
      @select="preset => emit('selectPreset', preset)"
    />

    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      <div
        v-for="item in scoreItems"
        :key="item.key"
        class="space-y-1.5"
      >
        <div class="flex items-center justify-between text-sm">
          <span>{{ item.label }}</span>
          <span class="font-mono text-xs">{{ item.value.toFixed(2) }}</span>
        </div>
        <UInputNumber
          :model-value="item.value"
          :min="item.min"
          :max="item.max"
          :step="item.step"
          class="w-full"
          @update:model-value="value => emit('updateWeight', item.key, Number(value ?? 0))"
        />
      </div>
    </div>

    <div class="text-sm font-semibold">
      {{ t('tournament.single.tablePreview.weights.formulaHeading') }}
    </div>
    <div class="rounded border border-default/70 bg-muted/20 p-3 font-mono text-xs text-center">
      {{ t('tournament.single.tablePreview.weights.formula') }}
    </div>
  </section>
</template>
