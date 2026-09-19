<!-- app\components\tournaments\single\Prizes.vue -->
<!--
  Booster-pack redistribution suggestion for the final standings, shown as
  its own stepper step between "awards" and "leaderboard" (user request,
  2026-09-17). Same standings source as Awards.vue (already final by the
  time this step is reachable) — index = final placement.

  Deliberately not persisted anywhere (user decision, 2026-09-17): totalPacks/
  minPacksPerPlayer/bonusShares/topCutoff all live in a local ref and reset
  the moment this component remounts.
-->
<script setup lang="ts">
import type { LiveCommanderStanding } from '~/composables/tournaments/pairing/useLiveCommanderStandings'
import type { PrizeDistributionSettings } from '~/types'

const { standings } = defineProps<{
  standings: LiveCommanderStanding[]
}>()

const { t } = useI18n()

const settings = ref<PrizeDistributionSettings>({ ...DEFAULT_PRIZE_DISTRIBUTION_SETTINGS })

function updateSettings(patch: Partial<PrizeDistributionSettings>) {
  settings.value = { ...settings.value, ...patch }
}

const {
  selectedPreset,
  hasCustomShares,
  saveCustomShares,
  applyDistributionPreset
} = usePrizeDistributionPresets(settings, updateSettings)

const { distribution, allocatedTotal } = usePrizeDistribution(
  () => standings.length,
  settings
)

const budget = computed(() => prizeBudgetOf(standings.length, settings.value))
const rewardedCount = computed(() => Math.min(settings.value.topCutoff, standings.length))
const packsRange = computed(() => rewardedPacksRange(standings.length, settings.value))

// Share = extra packs / bonus pool, taken from the packs a placement really gets
// (not the nominal share), so it stays true with rounding, caps and minimums
function realSharePercent(packs: number): number {
  const { bonusPool } = budget.value
  if (bonusPool <= 0) return 0
  return ((packs - settings.value.minPacksPerPlayer) / bonusPool) * 100
}

const rows = computed(() => standings.map((standing, index) => {
  const packs = distribution.value[index] ?? 0

  return {
    associateUuid: standing.associateUuid,
    label: standing.label,
    packs,
    sharePercent: index < rewardedCount.value ? realSharePercent(packs) : null
  }
}))

// Editing packs derives the matching share, so the two inputs stay linked
function updatePacks(rank: number, packs: number) {
  const bonusShares = sharesForPackEdit(rank, packs, standings.length, settings.value)
  updateSettings({ bonusShares })
  saveCustomShares(bonusShares)
}

// A share step moves exactly one pack to/from the other rewarded placements
function stepShare(rank: number, direction: 1 | -1) {
  const packs = rows.value[rank]?.packs ?? 0
  updatePacks(rank, packs + direction)
}

const sharesTotal = computed(() => Math.round(
  rows.value.reduce((sum, row) => sum + (row.sharePercent ?? 0), 0)
))

// Settings drawn as horizontal reference lines in the chart
const chartGuides = computed(() => {
  const { minPacksPerPlayer, nonRewardedMinPacks } = settings.value
  const { nonRewardedCount, bonusCap } = budget.value

  return {
    minPacks: minPacksPerPlayer,
    nonRewardedMinPacks: nonRewardedCount > 0 ? nonRewardedMinPacks : 0,
    maxPacks: Number.isFinite(bonusCap) ? minPacksPerPlayer + bonusCap : null
  }
})

// Chart only shows the rewarded placements (topCutoff), not every player
const chartRows = computed(() => rows.value.slice(0, settings.value.topCutoff).map(row => ({
  label: row.label,
  packs: row.packs
})))
</script>

<template>
  <div v-if="standings.length > 0" class="space-y-4">
    <h3 class="font-semibold text-lg flex items-center gap-2">
      <UIcon :name="ICONS.booster" class="text-primary" />
      {{ t('tournament.single.prizeDistribution.sectionTitle') }}
    </h3>

    <div class="grid grid-cols-1 gap-6 lg:h-[calc(100dvh-20rem)] lg:grid-cols-[55%_1fr]">
      <div class="flex min-h-0 flex-col gap-4">
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
          />
        </div>

        <div class="flex shrink-0 items-center justify-between text-sm">
          <span class="font-medium">
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
          </span>
          <span
            v-if="budget.bonusPool > 0"
            class="font-mono text-xs"
          >
            {{ t('tournament.single.prizeDistribution.sharesTotal', { total: sharesTotal }) }}
          </span>
        </div>

        <div class="min-h-0 flex-1 overflow-y-auto">
          <TournamentsSinglePrizesPrizeDistributionTable
            :rows="rows"
            :rewarded-count="rewardedCount"
            :min-packs="packsRange.min"
            :max-packs="packsRange.max"
            class="w-full"
            @update-packs="updatePacks"
            @step-share="stepShare"
          />
        </div>
      </div>
    </div>
  </div>
</template>
