<!-- app\components\tournaments\single\Prizes.vue -->
<!--
  Booster-pack redistribution suggestion for the final standings, shown as
  its own stepper step between "awards" and "leaderboard" (user request,
  2026-09-17). Same standings source as Awards.vue (already final by the
  time this step is reachable) — index = final placement.

  Deliberately not persisted anywhere (user decision, 2026-09-17): totalPacks/
  minPacksPerPlayer/decay/topCutoff and per-player overrides all live in
  local refs and reset the moment this component remounts. The UAlert below
  says so explicitly so the organizer doesn't assume a refresh is safe.
-->
<script setup lang="ts">
import type { LiveCommanderStanding } from '~/composables/tournaments/useLiveCommanderStandings'
import type { PrizeDistributionSettings } from '~/types'

const { standings } = defineProps<{
  standings: LiveCommanderStanding[]
}>()

const { t } = useI18n()

const settings = ref<PrizeDistributionSettings>({ ...DEFAULT_PRIZE_DISTRIBUTION_SETTINGS })

// Seeds totalPacks to "one per player" the first time standings actually
// resolve, so the field isn't stuck at 0 — a one-shot seed, not a
// continuous sync, so it doesn't stomp on an organizer-entered value once
// they've started editing.
let hasSeededTotalPacks = false
watch(() => standings.length, (count) => {
  if (hasSeededTotalPacks || count === 0) return
  settings.value.totalPacks = count
  hasSeededTotalPacks = true
}, { immediate: true })

function updateSettings(patch: Partial<PrizeDistributionSettings>) {
  settings.value = { ...settings.value, ...patch }
}

const { selectedPreset, applyDistributionPreset }
  = usePrizeDistributionPresets(settings, updateSettings)

const { distribution, isInsufficientPacks, allocatedTotal } = usePrizeDistribution(
  () => standings.length,
  settings
)

// associateUuid -> manual override, not persisted (see file header).
const overrides = ref<Record<string, number | null>>({})

function setOverride(associateUuid: string, packs: number | null) {
  overrides.value = { ...overrides.value, [associateUuid]: packs }
}

const rows = computed(() => standings.map((standing, index) => ({
  associateUuid: standing.associateUuid,
  label: standing.label,
  suggestedPacks: distribution.value[index] ?? 0,
  overridePacks: overrides.value[standing.associateUuid] ?? null
})))

const chartRows = computed(() => rows.value.map(row => ({
  label: row.label,
  packs: row.overridePacks ?? row.suggestedPacks
})))
</script>

<template>
  <div v-if="standings.length > 0" class="space-y-4">
    <h3 class="font-semibold text-lg flex items-center gap-2">
      <UIcon :name="ICONS.booster" class="text-primary" />
      {{ t('tournament.single.prizeDistribution.sectionTitle') }}
    </h3>

    <UAlert
      color="neutral"
      variant="subtle"
      :icon="ICONS.info"
      :title="t('tournament.single.prizeDistribution.notPersistedNoticeTitle')"
      :description="t('tournament.single.prizeDistribution.notPersistedNotice')"
    />

    <TournamentsSinglePrizesPrizeDistributionSettings
      :settings="settings"
      :player-count="standings.length"
      :selected-preset="selectedPreset"
      @select-preset="applyDistributionPreset"
      @update="updateSettings"
    />

    <UAlert
      v-if="isInsufficientPacks"
      color="warning"
      variant="subtle"
      :icon="ICONS.warning"
      :title="t('tournament.single.prizeDistribution.insufficientPacksTitle')"
      :description="t('tournament.single.prizeDistribution.insufficientPacksDescription', {
        allocated: allocatedTotal, total: settings.totalPacks
      })"
    />

    <TournamentsSinglePrizesPrizeDistributionChart :rows="chartRows" />

    <TournamentsSinglePrizesPrizeDistributionTable :rows="rows" @override="setOverride" />
  </div>
</template>
