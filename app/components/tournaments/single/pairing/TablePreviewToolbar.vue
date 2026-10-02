<!-- app\components\tournaments\single\pairing\TablePreviewToolbar.vue -->
<!--
  Total-score display + optimizer and random-seating controls above the pod
  grid — ported from MagicTheGathering/league's TablePreviewToolbar.vue
  (user request, 2026-09-15). useButtonLogging calls dropped — that
  analytics composable doesn't exist in this app.
-->
<script setup lang="ts">
const {
  totalScore,
  seed,
  loading = false,
  randomSeating = true
} = defineProps<{
  totalScore: number
  seed: number | null
  loading?: boolean
  // Round 1 only: from round 2 the tables follow the standings, so no shuffle/seed controls.
  randomSeating?: boolean
}>()

const emit = defineEmits<{
  openSettings: []
  optimize: []
  random: []
  applySeed: [seed: number]
}>()

const { t } = useI18n()
</script>

<template>
  <!-- Optimizer group (score, weights, optimize) | random seating group (seed, paste, shuffle). -->
  <div class="flex flex-wrap items-center justify-between gap-2">
    <div class="flex items-center gap-2">
      <span class="text-sm text-muted whitespace-nowrap">
        {{ t('tournament.single.tablePreview.toolbar.totalScoreLabel') }}
        <span class="font-semibold text-highlighted tabular-nums">{{ totalScore.toFixed(2) }}</span>
      </span>
      <UTooltip
        :content="{ side: 'top' }"
        :text="t('tournament.single.tablePreview.toolbar.weightsAndConstraintsTooltip')"
      >
        <UButton
          size="sm"
          color="neutral"
          variant="soft"
          :icon="ICONS.settings"
          :label="t('tournament.single.tablePreview.toolbar.weightsAndConstraints')"
          @click="emit('openSettings')"
        />
      </UTooltip>
      <UTooltip
        :content="{ side: 'top' }"
        :text="t('tournament.single.tablePreview.toolbar.optimizeTooltip')"
      >
        <UButton
          size="sm"
          color="neutral"
          variant="outline"
          :icon="ICONS.optimize"
          :label="t('tournament.single.tablePreview.toolbar.optimize')"
          :disabled="loading"
          @click="emit('optimize')"
        />
      </UTooltip>
    </div>

    <span v-if="!randomSeating" class="flex items-center gap-1.5 text-sm text-muted">
      <UIcon :name="ICONS.info" class="size-4 shrink-0" />
      {{ t('tournament.single.tablePreview.toolbar.standingsBased') }}
    </span>
    <div v-else class="flex items-center gap-1.5">
      <TournamentsSinglePairingShuffleSeedField :seed="seed" />
      <TournamentsSinglePairingApplySeedPopover
        :disabled="loading"
        @apply="value => emit('applySeed', value)"
      />
      <UTooltip
        :content="{ side: 'top' }"
        :text="t('tournament.single.tablePreview.toolbar.randomTooltip')"
      >
        <UButton
          size="sm"
          color="neutral"
          variant="outline"
          :icon="ICONS.shuffle"
          :label="t('tournament.single.tablePreview.toolbar.random')"
          :disabled="loading"
          @click="emit('random')"
        />
      </UTooltip>
    </div>
  </div>
</template>
