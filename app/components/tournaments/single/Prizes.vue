<!-- app\components\tournaments\single\Prizes.vue -->
<!--
  Booster-pack redistribution suggestion for the final standings, shown as
  its own stepper step between "awards" and "leaderboard" (user request,
  2026-09-17). Same standings source as Awards.vue (already final by the
  time this step is reachable) — index = final placement.

  Layout only: the state and the derived data live in
  usePrizeDistributionPage. Deliberately not persisted (user decision,
  2026-09-17): the settings reset the moment this component remounts.
-->
<script setup lang="ts">
import type { LiveCommanderStanding } from '~/composables/tournaments/pairing/useLiveCommanderStandings'

const { standings } = defineProps<{
  standings: LiveCommanderStanding[]
}>()

const { t } = useI18n()

const {
  settings,
  updateSettings,
  resetSettings,
  selectedPreset,
  hasCustomShares,
  applyDistributionPreset,
  allocatedTotal,
  budget,
  rewardedCount,
  rows,
  chartGuides,
  chartRows,
  updatePacks,
  stepShare
} = usePrizeDistributionPage(() => standings)
</script>

<template>
  <div v-if="standings.length > 0">
    <div class="grid grid-cols-1 gap-6 lg:h-[calc(100dvh-20rem)] lg:grid-cols-[55%_1fr]">
      <div class="flex min-h-0 flex-col gap-6">
        <TournamentsSinglePrizesPrizeDistributionSettings
          :settings="settings"
          :player-count="standings.length"
          class="shrink-0"
          @update="updateSettings"
        />

        <div class="h-96 shrink-0">
          <TournamentsSinglePrizesPrizeDistributionChart
            :rows="chartRows"
            :guides="chartGuides"
          />
        </div>
      </div>

      <div class="flex min-h-0 flex-col gap-3">
        <div class="shrink-0 space-y-2">
          <h4 class="text-base font-semibold">
            {{ t('tournament.single.prizeDistribution.shapeHeading') }}
          </h4>

          <TournamentsSinglePrizesPrizeDistributionPresetButtons
            :selected="selectedPreset"
            :has-custom="hasCustomShares"
            @select="applyDistributionPreset"
            @reset="resetSettings"
          />
        </div>

        <div class="shrink-0 text-sm font-medium">
          {{ t('tournament.single.prizeDistribution.distributedSummary', {
            assigned: allocatedTotal, total: budget.distributable
          }) }}
          <span
            v-if="settings.reservedPacks > 0"
            class="font-normal text-muted"
          >
            · {{ t('tournament.single.prizeDistribution.reservedSummary', {
              count: settings.reservedPacks
            }) }}
          </span>
        </div>

        <div class="min-h-0 flex-1 overflow-y-auto">
          <TournamentsSinglePrizesPrizeDistributionTable
            :rows="rows"
            :rewarded-count="rewardedCount"
            class="w-full"
            @update-packs="updatePacks"
            @step-share="stepShare"
          />
        </div>
      </div>
    </div>
  </div>
</template>
