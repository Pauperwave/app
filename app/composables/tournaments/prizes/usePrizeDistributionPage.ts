// app\composables\tournaments\prizes\usePrizeDistributionPage.ts
// State and derived data of the "prizes" step (Prizes.vue): the settings, the
// distribution over the final standings, the per-placement rows, the chart
// data and the linked share/pack edits. Not persisted (user decision,
// 2026-09-17), except the organizer's "custom" shares — see
// usePrizeDistributionPresets.
import type { PrizeDistributionSettings } from '~/types'
import type { LiveCommanderStanding } from '~/composables/tournaments/pairing/useLiveCommanderStandings'
import { usePrizeDistribution } from '~/composables/tournaments/prizes/usePrizeDistribution'
import { usePrizeDistributionPresets } from '~/composables/tournaments/prizes/usePrizeDistributionPresets'
import { DEFAULT_PRIZE_DISTRIBUTION_SETTINGS } from '~/utils/tournaments/prizes/prizeAllocation'
import { prizeBudgetOf, rewardedPacksRange } from '~/utils/tournaments/prizes/prizeBudget'
import { sharesForPackEdit } from '~/utils/tournaments/prizes/prizeShares'

type PrizeStanding = Pick<LiveCommanderStanding, 'associateUuid' | 'label'>

export function usePrizeDistributionPage(standings: MaybeRefOrGetter<PrizeStanding[]>) {
  const settings = ref<PrizeDistributionSettings>({ ...DEFAULT_PRIZE_DISTRIBUTION_SETTINGS })

  function updateSettings(patch: Partial<PrizeDistributionSettings>) {
    settings.value = { ...settings.value, ...patch }
  }

  const playerCount = computed(() => toValue(standings).length)

  const {
    selectedPreset,
    hasCustomShares,
    saveCustomShares,
    applyDistributionPreset
  } = usePrizeDistributionPresets(settings, updateSettings)

  const { distribution, allocatedTotal } = usePrizeDistribution(playerCount, settings)

  const budget = computed(() => prizeBudgetOf(playerCount.value, settings.value))
  const rewardedCount = computed(() => budget.value.rewardedCount)
  const packsRange = computed(() => rewardedPacksRange(playerCount.value, settings.value))

  // Share = extra packs / bonus pool, taken from the packs a placement really gets
  // (not the nominal share), so it stays true with rounding, caps and minimums
  function realSharePercent(packs: number): number {
    const { bonusPool } = budget.value
    if (bonusPool <= 0) return 0
    return ((packs - settings.value.minPacksPerPlayer) / bonusPool) * 100
  }

  const rows = computed(() => toValue(standings).map((standing, index) => {
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
    const bonusShares = sharesForPackEdit(rank, packs, playerCount.value, settings.value)
    updateSettings({ bonusShares })
    saveCustomShares(bonusShares)
  }

  // A share step moves exactly one pack to/from the other rewarded placements
  function stepShare(rank: number, direction: 1 | -1) {
    const packs = rows.value[rank]?.packs ?? 0
    updatePacks(rank, packs + direction)
  }

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

  // The chart only shows the rewarded placements, not every player
  const chartRows = computed(() => rows.value.slice(0, rewardedCount.value).map(row => ({
    label: row.label,
    packs: row.packs
  })))

  return {
    settings,
    updateSettings,
    selectedPreset,
    hasCustomShares,
    applyDistributionPreset,
    allocatedTotal,
    budget,
    rewardedCount,
    packsRange,
    rows,
    chartGuides,
    chartRows,
    updatePacks,
    stepShare
  }
}
