// app\composables\tournaments\prizes\usePrizeDistribution.ts
// Reactive wrapper around the pure prize allocation in
// app/utils/tournaments/prizes — pure calculation, no persistence (user
// request, 2026-09-17: "solo a schermo", the settings live in a local ref and
// reset on remount).
import type { PrizeDistributionSettings } from '~/types'
import { computePrizeDistribution } from '~/utils/tournaments/prizes/prizeAllocation'

export function usePrizeDistribution(
  rankedCount: MaybeRefOrGetter<number>,
  settings: MaybeRefOrGetter<PrizeDistributionSettings>
) {
  const distribution = computed(() =>
    computePrizeDistribution(toValue(rankedCount), toValue(settings)))

  const allocatedTotal = computed(() => distribution.value.reduce((sum, packs) => sum + packs, 0))

  return { distribution, allocatedTotal }
}
