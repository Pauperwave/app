<!-- app\components\statistics\AssociatesGrowthChart.client.vue -->
<script setup lang="ts">
import { format } from 'date-fns'
import { VisXYContainer, VisStackedBar, VisAxis, VisCrosshair, VisTooltip } from '@unovis/vue'
import type { AssociatesGrowthPoint } from '~/composables/statistics/useAssociatesStatistics'

const { t } = useI18n()

const { growthSeries, totalAssociates } = useAssociatesStatistics()

// Nuovi (joined this month) / Rinnovati (renewed for this month's year,
// reconstructed from the full renewal history) / Non rinnovati (didn't) —
// see useAssociatesStatistics.ts's growthSeries for how each is computed.
// Semantic colors here (unlike the shared chartPalette other charts on this
// page use) since each of the three genuinely IS good/neutral/bad news, not
// just three flavors of the same thing. Order here is stack order
// (VisStackedBar stacks bottom-to-top in y-accessor order) — Rinnovati at
// the bottom, Nuovi stacked on top of it, per request.
const SERIES: { key: 'newCount' | 'retained' | 'notRenewed', labelKey: string, color: string }[] = [
  { key: 'retained', labelKey: 'statistic.growthSeries.retained', color: 'var(--ui-primary)' },
  { key: 'newCount', labelKey: 'statistic.growthSeries.new', color: 'var(--ui-success)' },
  { key: 'notRenewed', labelKey: 'statistic.growthSeries.notRenewed', color: 'var(--ui-error)' }
]

const colors = SERIES.map(series => series.color)
const legendItems = SERIES.map(series => ({
  name: t(series.labelKey),
  color: series.color
}))

const x = (_: AssociatesGrowthPoint, i: number) => i
const y = SERIES.map(series => (d: AssociatesGrowthPoint) => d[series.key])

const template = (d: AssociatesGrowthPoint) => [
  `<strong>${format(d.date, 'MMM yyy')}</strong>`,
  ...SERIES
    .filter(series => d[series.key])
    .map(series => `${t(series.labelKey)}: ${d[series.key]}`)
].join('<br>')

// One label per year (at each January point, growthSeries always starts on
// one — see useAssociatesStatistics.ts) — same "one tick per year" treatment
// as TournamentsPerYearChart.client.vue, instead of VisAxis's default "nice
// number for the width" heuristic, which was only labelling 2-3 arbitrary
// months across the whole series.
const yearStartIndices = computed(() => growthSeries.value
  .reduce<number[]>((indices, point, i) => {
    if (point.date.getMonth() === 0) indices.push(i)
    return indices
  }, []))

const xTicks = (i: number) => growthSeries.value[i]?.date.getFullYear().toString() ?? ''
</script>

<template>
  <StatisticsStatChartCard
    :title="t('statistic.charts.growth')"
    :value="totalAssociates"
    :caption="t('statistic.stats.totalAssociates')"
    :legend-items="legendItems"
    legend-bullet-size="18px"
    legend-label-font-size="18px"
  >
    <template #default="{ width }">
      <VisXYContainer
        v-if="growthSeries.length"
        :data="growthSeries"
        :padding="{ top: 40 }"
        class="h-96"
        :width="width"
      >
        <VisStackedBar :x="x" :y="y" :color="colors" />

        <VisAxis
          type="x"
          :x="x"
          :tick-format="xTicks"
          :tick-values="yearStartIndices"
        />

        <VisCrosshair :color="colors" :template="template" />

        <VisTooltip />
      </VisXYContainer>
    </template>
  </StatisticsStatChartCard>
</template>
