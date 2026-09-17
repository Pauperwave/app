<!-- app\components\tournaments\single\prizes\PrizeDistributionSettings.vue -->
<!--
  Resource inputs (totalPacks/minPacksPerPlayer) + distribution-shape
  sliders (decay/topCutoff) for the prize suggestion panel — same
  UInputNumber slider layout as PairingWeightsSection.vue, split into two
  groups since totalPacks/minPacksPerPlayer aren't part of any preset
  (organizer-entered resources, not a "shape" the presets drive).
-->
<script setup lang="ts">
import type { PrizeDistributionSettings } from '~/types'
import type { PrizeDistributionPresetKind } from './PrizeDistributionPresetButtons.vue'

const { settings, playerCount, selectedPreset } = defineProps<{
  settings: PrizeDistributionSettings
  playerCount: number
  selectedPreset: PrizeDistributionPresetKind
}>()

const emit = defineEmits<{
  selectPreset: [preset: Exclude<PrizeDistributionPresetKind, 'custom'>]
  update: [patch: Partial<PrizeDistributionSettings>]
}>()

const { t } = useI18n()

const shapeItems = computed(() => [
  {
    key: 'decay' as const,
    label: t('tournament.single.prizeDistribution.weightLabels.decay'),
    value: settings.decay,
    min: 0.1,
    max: 1,
    step: 0.05
  },
  {
    key: 'topCutoff' as const,
    label: t('tournament.single.prizeDistribution.weightLabels.topCutoff'),
    value: Math.min(settings.topCutoff, playerCount),
    min: 1,
    max: Math.max(1, playerCount),
    step: 1
  }
])
</script>

<template>
  <section class="space-y-4">
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div class="space-y-1.5">
        <span class="text-sm">{{ t('tournament.single.prizeDistribution.totalPacks') }}</span>
        <UInputNumber
          :model-value="settings.totalPacks"
          :min="0"
          class="w-full"
          :icon="ICONS.package"
          @update:model-value="value => emit('update', { totalPacks: Number(value ?? 0) })"
        />
      </div>
      <div class="space-y-1.5">
        <span class="text-sm">{{ t('tournament.single.prizeDistribution.minPacksPerPlayer') }}</span>
        <UInputNumber
          :model-value="settings.minPacksPerPlayer"
          :min="0"
          class="w-full"
          :icon="ICONS.booster"
          @update:model-value="value => emit('update', { minPacksPerPlayer: Number(value ?? 0) })"
        />
      </div>
    </div>

    <div class="space-y-3">
      <div class="text-sm font-semibold">
        {{ t('tournament.single.prizeDistribution.shapeHeading') }}
      </div>

      <TournamentsSinglePrizesPrizeDistributionPresetButtons
        :selected="selectedPreset"
        @select="preset => emit('selectPreset', preset)"
      />

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div
          v-for="item in shapeItems"
          :key="item.key"
          class="space-y-1.5"
        >
          <div class="flex items-center justify-between text-sm">
            <span>{{ item.label }}</span>
            <span class="font-mono text-xs">{{ item.value.toFixed(item.key === 'decay' ? 2 : 0) }}</span>
          </div>
          <UInputNumber
            :model-value="item.value"
            :min="item.min"
            :max="item.max"
            :step="item.step"
            class="w-full"
            @update:model-value="value => emit('update', { [item.key]: Number(value ?? 0) })"
          />
        </div>
      </div>
    </div>
  </section>
</template>
