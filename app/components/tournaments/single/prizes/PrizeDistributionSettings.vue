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

// Limits keep "every guaranteed minimum + reserve <= total packs" always true
const rewardedCount = computed(() => Math.max(1, Math.min(settings.topCutoff, playerCount)))
const nonRewardedCount = computed(() => Math.max(0, playerCount - rewardedCount.value))

const rewardedGuaranteed = computed(() => settings.minPacksPerPlayer * rewardedCount.value)
const nonRewardedGuaranteed = computed(() => settings.nonRewardedMinPacks * nonRewardedCount.value)

const minTotalPacks = computed(() =>
  rewardedGuaranteed.value + nonRewardedGuaranteed.value + settings.reservedPacks)

const maxMinPacksPerPlayer = computed(() => Math.max(0, Math.floor(
  (settings.totalPacks - settings.reservedPacks - nonRewardedGuaranteed.value) / rewardedCount.value
)))

const maxNonRewardedMinPacks = computed(() => {
  if (nonRewardedCount.value === 0) return 0
  const spare = settings.totalPacks - settings.reservedPacks - rewardedGuaranteed.value
  return Math.max(0, Math.floor(spare / nonRewardedCount.value))
})

const maxReservedPacks = computed(() =>
  Math.max(0, settings.totalPacks - rewardedGuaranteed.value - nonRewardedGuaranteed.value))

const maxTopCutoff = computed(() => {
  const {
    minPacksPerPlayer, nonRewardedMinPacks, totalPacks, reservedPacks
  } = settings
  if (minPacksPerPlayer <= nonRewardedMinPacks) return Math.max(1, playerCount)

  const spare = totalPacks - reservedPacks - nonRewardedMinPacks * playerCount
  const affordable = Math.floor(spare / (minPacksPerPlayer - nonRewardedMinPacks))
  return Math.max(1, Math.min(playerCount, affordable))
})

// Lowest useful cap: below it the rewarded packs would not fit, so the cap would be ignored
const minMaxPacksPerPlayer = computed(() => {
  const rewardedPool = settings.totalPacks - settings.reservedPacks - nonRewardedGuaranteed.value
  return Math.max(settings.minPacksPerPlayer, Math.ceil(rewardedPool / rewardedCount.value))
})

// 0 turns the cap off; values below the lowest useful cap jump to it (or back to 0)
function updateMaxPacksPerPlayer(value: number) {
  const isUnusable = value > 0 && value < minMaxPacksPerPlayer.value
  const next = isUnusable
    ? (value > settings.maxPacksPerPlayer ? minMaxPacksPerPlayer.value : 0)
    : value

  emit('update', { maxPacksPerPlayer: next })
}

// Tooltip explaining why a control's +/- is disabled; undefined while it isn't
const totalPacksHint = computed(() => (settings.totalPacks <= minTotalPacks.value
  ? t('tournament.single.prizeDistribution.hints.totalPacksAtMin', {
    min: minTotalPacks.value, count: rewardedCount.value
  })
  : undefined))

const minPacksHint = computed(() => (settings.minPacksPerPlayer >= maxMinPacksPerPlayer.value
  ? t('tournament.single.prizeDistribution.hints.minPacksAtMax', {
    total: settings.totalPacks, count: rewardedCount.value
  })
  : undefined))

const nonRewardedMinHint = computed(() => {
  if (nonRewardedCount.value === 0) {
    return t('tournament.single.prizeDistribution.hints.nonRewardedNone')
  }

  return settings.nonRewardedMinPacks >= maxNonRewardedMinPacks.value
    ? t('tournament.single.prizeDistribution.hints.nonRewardedAtMax', {
      total: settings.totalPacks
    })
    : undefined
})

const reservedHint = computed(() => (settings.reservedPacks >= maxReservedPacks.value
  ? t('tournament.single.prizeDistribution.hints.reservedAtMax')
  : undefined))

const topCutoffHint = computed(() => {
  if (rewardedCount.value < maxTopCutoff.value) return undefined

  return maxTopCutoff.value >= playerCount
    ? t('tournament.single.prizeDistribution.hints.topCutoffAllPlayers')
    : t('tournament.single.prizeDistribution.hints.topCutoffAtMax', {
      total: settings.totalPacks, min: settings.minPacksPerPlayer, max: maxTopCutoff.value
    })
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
        <UInputNumber
          :model-value="settings.totalPacks"
          :min="minTotalPacks"
          class="w-full"
          :icon="ICONS.package"
          @update:model-value="value => emit('update', { totalPacks: Number(value ?? 0) })"
        />
      </UTooltip>
    </div>

    <div class="w-52 space-y-1.5">
      <span class="text-sm">{{ t('tournament.single.prizeDistribution.reservedPacks') }}</span>
      <UTooltip
        :text="reservedHint"
        :disabled="!reservedHint"
      >
        <UInputNumber
          :model-value="settings.reservedPacks"
          :min="0"
          :max="maxReservedPacks"
          class="w-full"
          :icon="ICONS.package"
          @update:model-value="value => emit('update', { reservedPacks: Number(value ?? 0) })"
        />
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
        <UInputNumber
          :model-value="settings.minPacksPerPlayer"
          :min="0"
          :max="maxMinPacksPerPlayer"
          class="w-full"
          :icon="ICONS.booster"
          @update:model-value="value => emit('update', { minPacksPerPlayer: Number(value ?? 0) })"
        />
      </UTooltip>
    </div>

    <div class="w-52 space-y-1.5">
      <span class="text-sm">{{ t('tournament.single.prizeDistribution.nonRewardedMinPacks') }}</span>
      <UTooltip
        :text="nonRewardedMinHint"
        :disabled="!nonRewardedMinHint"
      >
        <UInputNumber
          :model-value="settings.nonRewardedMinPacks"
          :min="0"
          :max="maxNonRewardedMinPacks"
          :disabled="nonRewardedCount === 0"
          class="w-full"
          :icon="ICONS.players"
          @update:model-value="value => emit('update', { nonRewardedMinPacks: Number(value ?? 0) })"
        />
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
        <UInputNumber
          :model-value="Math.min(settings.topCutoff, playerCount)"
          :min="1"
          :max="maxTopCutoff"
          :step="1"
          class="w-full"
          :icon="ICONS.standings"
          @update:model-value="value => emit('update', { topCutoff: Number(value ?? 0) })"
        />
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
