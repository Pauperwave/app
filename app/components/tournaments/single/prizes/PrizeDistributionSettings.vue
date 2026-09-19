<!-- app\components\tournaments\single\prizes\PrizeDistributionSettings.vue -->
<!--
  Prize suggestion inputs, three rows of two: packs available / set aside,
  guaranteed minimum for rewarded / non-rewarded players, and how many
  placements are rewarded / the cap per placement. Same
  UInputNumber layout as PairingWeightsSection.vue; the distribution shape
  (presets + per-placement shares) lives next to the standings table.
-->
<script setup lang="ts">
import type { PrizeDistributionSettings } from '~/types'

const { settings, playerCount } = defineProps<{
  settings: PrizeDistributionSettings
  playerCount: number
}>()

const emit = defineEmits<{
  update: [patch: Partial<PrizeDistributionSettings>]
}>()

const { t } = useI18n()

// The bounds keep "every guaranteed minimum + reserve <= total packs" always true
const limits = computed(() => prizeSettingsLimits(settings, playerCount))
const states = computed(() => prizeLimitStates(settings, playerCount))

function updateMaxPacksPerPlayer(value: number) {
  emit('update', {
    maxPacksPerPlayer: resolveMaxPacksPerPlayer(
      value,
      settings.maxPacksPerPlayer,
      limits.value.lowestUsefulCap
    )
  })
}

// Tooltip explaining why a control's +/- is disabled; undefined while it isn't
const totalPacksHint = computed(() => (states.value.totalPacksAtMin
  ? t('tournament.single.prizeDistribution.hints.totalPacksAtMin', {
    min: limits.value.minTotalPacks, count: limits.value.rewardedCount
  })
  : undefined))

const minPacksHint = computed(() => (states.value.minPacksAtMax
  ? t('tournament.single.prizeDistribution.hints.minPacksAtMax', {
    total: settings.totalPacks, count: limits.value.rewardedCount
  })
  : undefined))

const nonRewardedMinHint = computed(() => {
  if (states.value.nonRewarded === 'none') {
    return t('tournament.single.prizeDistribution.hints.nonRewardedNone')
  }

  return states.value.nonRewarded === 'atMax'
    ? t('tournament.single.prizeDistribution.hints.nonRewardedAtMax', { total: settings.totalPacks })
    : undefined
})

const reservedHint = computed(() => (states.value.reservedAtMax
  ? t('tournament.single.prizeDistribution.hints.reservedAtMax')
  : undefined))

const topCutoffHint = computed(() => {
  if (states.value.topCutoff === 'allPlayers') {
    return t('tournament.single.prizeDistribution.hints.topCutoffAllPlayers')
  }

  return states.value.topCutoff === 'atMax'
    ? t('tournament.single.prizeDistribution.hints.topCutoffAtMax', {
      total: settings.totalPacks,
      min: settings.minPacksPerPlayer,
      max: limits.value.maxTopCutoff
    })
    : undefined
})
</script>

<template>
  <section class="grid w-fit grid-cols-2 gap-x-3 gap-y-1">
    <h4 class="col-span-2 mt-1.5 text-base font-semibold first:mt-0">
      {{ t('tournament.single.prizeDistribution.sections.packs') }}
    </h4>

    <HintedNumberField
      :label="t('tournament.single.prizeDistribution.totalPacks')"
      :info="t('tournament.single.prizeDistribution.info.totalPacks')"
      :hint="totalPacksHint"
      :model-value="settings.totalPacks"
      :min="limits.minTotalPacks"
      size="sm"
      :icon="ICONS.package"
      class="w-60"
      @update:model-value="value => emit('update', { totalPacks: value })"
    />

    <HintedNumberField
      :label="t('tournament.single.prizeDistribution.reservedPacks')"
      :info="t('tournament.single.prizeDistribution.info.reservedPacks')"
      :hint="reservedHint"
      :model-value="settings.reservedPacks"
      :min="0"
      :max="limits.maxReservedPacks"
      size="sm"
      :icon="ICONS.package"
      class="w-60"
      @update:model-value="value => emit('update', { reservedPacks: value })"
    />

    <h4 class="col-span-2 mt-1.5 text-base font-semibold first:mt-0">
      {{ t('tournament.single.prizeDistribution.sections.minimums') }}
    </h4>

    <HintedNumberField
      :label="t('tournament.single.prizeDistribution.minPacksPerPlayer')"
      :info="t('tournament.single.prizeDistribution.info.minPacksPerPlayer')"
      :hint="minPacksHint"
      :model-value="settings.minPacksPerPlayer"
      :min="0"
      :max="limits.maxMinPacksPerPlayer"
      size="sm"
      :icon="ICONS.booster"
      class="w-60"
      @update:model-value="value => emit('update', { minPacksPerPlayer: value })"
    />

    <HintedNumberField
      :label="t('tournament.single.prizeDistribution.nonRewardedMinPacks')"
      :info="t('tournament.single.prizeDistribution.info.nonRewardedMinPacks')"
      :hint="nonRewardedMinHint"
      :model-value="settings.nonRewardedMinPacks"
      :min="0"
      :max="limits.maxNonRewardedMinPacks"
      :disabled="limits.nonRewardedCount === 0"
      size="sm"
      :icon="ICONS.players"
      class="w-60"
      @update:model-value="value => emit('update', { nonRewardedMinPacks: value })"
    />

    <h4 class="col-span-2 mt-1.5 text-base font-semibold first:mt-0">
      {{ t('tournament.single.prizeDistribution.sections.placements') }}
    </h4>

    <HintedNumberField
      :label="t('tournament.single.prizeDistribution.weightLabels.topCutoff')"
      :info="t('tournament.single.prizeDistribution.info.topCutoff')"
      :hint="topCutoffHint"
      :model-value="Math.min(settings.topCutoff, playerCount)"
      :min="1"
      :max="limits.maxTopCutoff"
      :step="1"
      size="sm"
      :icon="ICONS.standings"
      class="w-60"
      @update:model-value="value => emit('update', { topCutoff: value })"
    />

    <!-- Greyed out while 0, i.e. no cap in effect -->
    <HintedNumberField
      :label="t('tournament.single.prizeDistribution.maxPacksPerPlayer')"
      :info="t('tournament.single.prizeDistribution.info.maxPacksPerPlayer')"
      :model-value="settings.maxPacksPerPlayer"
      :min="0"
      :step="1"
      :dimmed="settings.maxPacksPerPlayer === 0"
      size="sm"
      :icon="ICONS.package"
      class="w-60"
      @update:model-value="updateMaxPacksPerPlayer"
    />
  </section>
</template>
