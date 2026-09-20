<!-- app\components\tournaments\single\prizes\PrizeDistributionSettings.vue -->
<!--
  Prize suggestion inputs, three columns of two: packs available / set aside,
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
const resetTargets = computed(() => prizeResetTargets(settings, playerCount))

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

const minPacksHint = computed(() => {
  if (states.value.minPacksAtMin) {
    return t('tournament.single.prizeDistribution.hints.minPacksAtMin', {
      min: limits.value.minMinPacksPerPlayer
    })
  }

  return states.value.minPacksAtMax
    ? t('tournament.single.prizeDistribution.hints.minPacksAtMax', {
      total: settings.totalPacks, count: limits.value.rewardedCount
    })
    : undefined
})

const nonRewardedMinHint = computed(() => {
  if (states.value.nonRewarded === 'none') {
    return t('tournament.single.prizeDistribution.hints.nonRewardedNone')
  }

  if (states.value.nonRewarded === 'atRewardedMin') {
    return t('tournament.single.prizeDistribution.hints.nonRewardedAtRewardedMin', {
      min: settings.minPacksPerPlayer
    })
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
  <section class="grid w-full grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-3">
    <div class="space-y-2">
      <h4 class="text-base font-semibold">
        {{ t('tournament.single.prizeDistribution.sections.packs') }}
      </h4>

      <div class="space-y-3">
        <HintedNumberField
          :label="t('tournament.single.prizeDistribution.totalPacks')"
          :info="t('tournament.single.prizeDistribution.info.totalPacks')"
          :reset-value="resetTargets.totalPacks"
          :hint="totalPacksHint"
          :model-value="settings.totalPacks"
          :min="limits.minTotalPacks"
          :icon="ICONS.package"
          class="w-full"
          @update:model-value="value => emit('update', { totalPacks: value })"
        />

        <HintedNumberField
          :label="t('tournament.single.prizeDistribution.reservedPacks')"
          :info="t('tournament.single.prizeDistribution.info.reservedPacks')"
          :reset-value="resetTargets.reservedPacks"
          :hint="reservedHint"
          :model-value="settings.reservedPacks"
          :min="0"
          :max="limits.maxReservedPacks"
          :icon="ICONS.package"
          class="w-full"
          @update:model-value="value => emit('update', { reservedPacks: value })"
        />
      </div>
    </div>

    <div class="space-y-2">
      <h4 class="text-base font-semibold">
        {{ t('tournament.single.prizeDistribution.sections.minimums') }}
      </h4>

      <div class="space-y-3">
        <HintedNumberField
          :label="t('tournament.single.prizeDistribution.minPacksPerPlayer')"
          :info="t('tournament.single.prizeDistribution.info.minPacksPerPlayer')"
          :reset-value="resetTargets.minPacksPerPlayer"
          :hint="minPacksHint"
          :model-value="settings.minPacksPerPlayer"
          :min="limits.minMinPacksPerPlayer"
          :max="limits.maxMinPacksPerPlayer"
          :icon="ICONS.booster"
          class="w-full"
          @update:model-value="value => emit('update', { minPacksPerPlayer: value })"
        />

        <HintedNumberField
          :label="t('tournament.single.prizeDistribution.nonRewardedMinPacks')"
          :info="t('tournament.single.prizeDistribution.info.nonRewardedMinPacks')"
          :reset-value="resetTargets.nonRewardedMinPacks"
          :hint="nonRewardedMinHint"
          :model-value="settings.nonRewardedMinPacks"
          :min="0"
          :max="limits.maxNonRewardedMinPacks"
          :disabled="limits.nonRewardedCount === 0"
          :icon="ICONS.players"
          class="w-full"
          @update:model-value="value => emit('update', { nonRewardedMinPacks: value })"
        />
      </div>
    </div>

    <div class="space-y-2">
      <h4 class="text-base font-semibold">
        {{ t('tournament.single.prizeDistribution.sections.placements') }}
      </h4>

      <div class="space-y-3">
        <HintedNumberField
          :label="t('tournament.single.prizeDistribution.weightLabels.topCutoff')"
          :info="t('tournament.single.prizeDistribution.info.topCutoff')"
          :reset-value="resetTargets.topCutoff"
          :hint="topCutoffHint"
          :model-value="Math.min(settings.topCutoff, playerCount)"
          :min="1"
          :max="limits.maxTopCutoff"
          :step="1"
          :icon="ICONS.standings"
          class="w-full"
          @update:model-value="value => emit('update', { topCutoff: value })"
        />

        <!-- Greyed out while 0, i.e. no cap in effect -->
        <HintedNumberField
          :label="t('tournament.single.prizeDistribution.maxPacksPerPlayer')"
          :info="t('tournament.single.prizeDistribution.info.maxPacksPerPlayer')"
          :reset-value="resetTargets.maxPacksPerPlayer"
          :model-value="settings.maxPacksPerPlayer"
          :min="0"
          :step="1"
          :dimmed="settings.maxPacksPerPlayer === 0"
          :icon="ICONS.package"
          class="w-full"
          @update:model-value="updateMaxPacksPerPlayer"
        />
      </div>
    </div>
  </section>
</template>
