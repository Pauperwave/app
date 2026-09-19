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
  <section class="grid w-fit grid-cols-2 gap-x-3 gap-y-2">
    <h4 class="col-span-2 text-base font-semibold">
      {{ t('tournament.single.prizeDistribution.sections.packs') }}
    </h4>

    <div class="w-52 space-y-1.5">
      <span class="text-sm">{{ t('tournament.single.prizeDistribution.totalPacks') }}</span>
      <UTooltip
        :text="totalPacksHint"
        :disabled="!totalPacksHint"
      >
        <!-- native wrapper: UInputNumber drops the tooltip trigger listeners -->
        <div>
          <UInputNumber
            :model-value="settings.totalPacks"
            :min="limits.minTotalPacks"
            class="w-full"
            :icon="ICONS.package"
            @update:model-value="value => emit('update', { totalPacks: Number(value ?? 0) })"
          />
        </div>
      </UTooltip>
    </div>

    <div class="w-52 space-y-1.5">
      <span class="text-sm">{{ t('tournament.single.prizeDistribution.reservedPacks') }}</span>
      <UTooltip
        :text="reservedHint"
        :disabled="!reservedHint"
      >
        <!-- native wrapper: UInputNumber drops the tooltip trigger listeners -->
        <div>
          <UInputNumber
            :model-value="settings.reservedPacks"
            :min="0"
            :max="limits.maxReservedPacks"
            class="w-full"
            :icon="ICONS.package"
            @update:model-value="value => emit('update', { reservedPacks: Number(value ?? 0) })"
          />
        </div>
      </UTooltip>
    </div>

    <h4 class="col-span-2 text-base font-semibold">
      {{ t('tournament.single.prizeDistribution.sections.minimums') }}
    </h4>

    <div class="w-52 space-y-1.5">
      <span class="text-sm">{{ t('tournament.single.prizeDistribution.minPacksPerPlayer') }}</span>
      <UTooltip
        :text="minPacksHint"
        :disabled="!minPacksHint"
      >
        <!-- native wrapper: UInputNumber drops the tooltip trigger listeners -->
        <div>
          <UInputNumber
            :model-value="settings.minPacksPerPlayer"
            :min="0"
            :max="limits.maxMinPacksPerPlayer"
            class="w-full"
            :icon="ICONS.booster"
            @update:model-value="value => emit('update', { minPacksPerPlayer: Number(value ?? 0) })"
          />
        </div>
      </UTooltip>
    </div>

    <div class="w-52 space-y-1.5">
      <span class="text-sm">{{ t('tournament.single.prizeDistribution.nonRewardedMinPacks') }}</span>
      <UTooltip
        :text="nonRewardedMinHint"
        :disabled="!nonRewardedMinHint"
      >
        <!-- native wrapper: UInputNumber drops the tooltip trigger listeners -->
        <div>
          <UInputNumber
            :model-value="settings.nonRewardedMinPacks"
            :min="0"
            :max="limits.maxNonRewardedMinPacks"
            :disabled="limits.nonRewardedCount === 0"
            class="w-full"
            :icon="ICONS.players"
            @update:model-value="value => emit('update', {
              nonRewardedMinPacks: Number(value ?? 0)
            })"
          />
        </div>
      </UTooltip>
    </div>

    <h4 class="col-span-2 text-base font-semibold">
      {{ t('tournament.single.prizeDistribution.sections.placements') }}
    </h4>

    <div class="w-52 space-y-1.5">
      <span class="text-sm">{{ t('tournament.single.prizeDistribution.weightLabels.topCutoff') }}</span>
      <UTooltip
        :text="topCutoffHint"
        :disabled="!topCutoffHint"
      >
        <!-- native wrapper: UInputNumber drops the tooltip trigger listeners -->
        <div>
          <UInputNumber
            :model-value="Math.min(settings.topCutoff, playerCount)"
            :min="1"
            :max="limits.maxTopCutoff"
            :step="1"
            class="w-full"
            :icon="ICONS.standings"
            @update:model-value="value => emit('update', { topCutoff: Number(value ?? 0) })"
          />
        </div>
      </UTooltip>
    </div>

    <div class="w-52 space-y-1.5">
      <span class="text-sm">{{ t('tournament.single.prizeDistribution.maxPacksPerPlayer') }}</span>
      <!-- Greyed out while 0, i.e. no cap in effect -->
      <UInputNumber
        :model-value="settings.maxPacksPerPlayer"
        :min="0"
        :step="1"
        class="w-full"
        :class="{ 'opacity-50': settings.maxPacksPerPlayer === 0 }"
        :icon="ICONS.package"
        @update:model-value="value => updateMaxPacksPerPlayer(Number(value ?? 0))"
      />
    </div>
  </section>
</template>
