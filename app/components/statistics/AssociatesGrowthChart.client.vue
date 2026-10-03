<!-- app\components\statistics\AssociatesGrowthChart.client.vue -->
<script setup lang="ts">
import { format } from 'date-fns'
import { VisXYContainer, VisStackedBar, VisAxis, VisCrosshair, VisTooltip } from '@unovis/vue'
import type { AssociatesGrowthPoint } from '~/composables/statistics/useAssociatesStatistics'

const { t } = useI18n()

const { growthSeries, totalAssociates, isLoading } = useAssociatesStatistics()

// Nuovi (joined this month) / Rinnovati (renewed for this month's year, from the full renewal
// history) / Non rinnovati (didn't): see useAssociatesStatistics.ts's growthSeries. Semantic colors
// (unlike the shared chartPalette of other charts here), since each of the three is genuinely
// good/neutral/bad news. Order is stack order (VisStackedBar stacks bottom-to-top in y-accessor
// order): Rinnovati at the bottom, Nuovi on top
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

// One label per year (at each January point, which growthSeries always starts on, see
// useAssociatesStatistics.ts), like TournamentsPerYearChart.client.vue, instead of VisAxis's
// default "nice number for the width" heuristic, which labelled 2-3 arbitrary months
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
    :loading="isLoading"
  >
    <template #default="{ width }">
      <VisXYContainer
        v-if="growthSeries.length"
        :data="growthSeries"
        :padding="{ top: 40 }"
        class="h-96"
        :width="width"
      >
        <VisStackedBar
          :x="x"
          :y="y"
          :color="colors"
        />

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
