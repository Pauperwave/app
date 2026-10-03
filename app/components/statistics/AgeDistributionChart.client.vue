<!-- app\components\statistics\AgeDistributionChart.client.vue -->
<script setup lang="ts">
import {
  VisXYContainer, VisGroupedBar, VisArea, VisLine, VisAxis, VisCrosshair, VisTooltip
} from '@unovis/vue'
import type { AgePoint } from '~/composables/statistics/useAssociatesStatistics'

interface AgeChartPoint extends AgePoint {
  density: number
}

const { selectedYear } = defineProps<{ selectedYear: number }>()

const { t } = useI18n()

const { ageDistribution, medianAge, isLoading } = useAssociatesStatistics(toRef(() => selectedYear))

function gaussianKernel(u: number): number {
  return Math.exp(-0.5 * u * u) / Math.sqrt(2 * Math.PI)
}

// The same array the bars are built from, with a `density` field merged in (Gaussian KDE, bandwidth
// via Silverman's rule of thumb), rather than a separate array passed to VisArea/VisLine via their
// `data` prop: a per-component `data` override left the curve components mounted with an empty
// <path> (the density values were correct but the path's `d` never got populated). One shared array
// read by every child, like AssociatesGrowthChart.client.vue's VisLine+VisArea, sidesteps that
// reactivity gap
const chartData = computed<AgeChartPoint[]>(() => {
  const samples = ageDistribution.value.flatMap(point => Array(point.count).fill(point.age))
  const n = samples.length

  if (n < 2) return ageDistribution.value.map(point => ({ ...point, density: 0 }))

  const mean = samples.reduce((sum, age) => sum + age, 0) / n
  const variance = samples.reduce((sum, age) => sum + (age - mean) ** 2, 0) / (n - 1)
  const stdDev = Math.sqrt(variance)
  const bandwidth = stdDev > 0 ? 1.06 * stdDev * n ** (-1 / 5) : 1

  // Scaled by n so the curve's magnitude lines up with the bars' raw counts:
  // a plain density integrates to 1 across the whole range, which would
  // render as a flat line near zero next to counts in the tens.
  return ageDistribution.value.map((point) => {
    const kernelSum = samples
      .reduce((sum, age) => sum + gaussianKernel((point.age - age) / bandwidth), 0)
    return { ...point, density: kernelSum / bandwidth }
  })
})

const x = (_: AgeChartPoint, i: number) => i
const y = (d: AgeChartPoint) => d.count
const densityY = (d: AgeChartPoint) => d.density

// Half a bar-slot of breathing room on each side — same reasoning as
// TournamentsPerYearChart.client.vue's own xDomain.
const xDomain = computed<[number, number]>(() => [-0.5, chartData.value.length - 0.5])

// VisAxis's default "nice number for the width" tick heuristic left this axis too sparse (one bar
// per age, 2-3 labels in all): a tick every 5 years reads naturally for ages and stays legible
// whatever the age range
const xTicks = (i: number) => chartData.value[i]?.age.toString() ?? ''
const xTickValues = computed(() => chartData.value
  .reduce<number[]>((indices, point, i) => {
    if (point.age % 5 === 0) indices.push(i)
    return indices
  }, []))

// e.g. "35 anni (1991): 14 associati": the birth year is approximate (age is whole completed years)
// but explicit enough to place the bar in time. Relative to selectedYear, not "today" (age is
// computed as of that year, see useAssociatesStatistics.ts's agesAsOfSelectedYear)
const template = (d: AgeChartPoint) => t(
  'statistic.ageDistributionTooltip',
  { age: d.age, year: selectedYear - d.age, count: d.count },
  d.count
)
</script>

<template>
  <StatisticsStatChartCard
    :title="t('statistic.charts.ageDistribution')"
    :value="medianAge ?? '—'"
    :caption="t('statistic.stats.medianAge')"
    :loading="isLoading"
  >
    <template #default="{ width }">
      <VisXYContainer
        v-if="chartData.length"
        :data="chartData"
        :padding="{ top: 40 }"
        :x-domain="xDomain"
        class="h-96"
        :width="width"
      >
        <VisGroupedBar
          :x="x"
          :y="y"
          color="var(--ui-primary)"
        />

        <VisArea
          :x="x"
          :y="densityY"
          color="var(--ui-text-highlighted)"
          :opacity="0.15"
        />
        <VisLine
          :x="x"
          :y="densityY"
          color="var(--ui-text-highlighted)"
          :line-width="2.5"
        />

        <VisAxis
          type="x"
          :x="x"
          :tick-format="xTicks"
          :tick-values="xTickValues"
        />

        <!-- fallow-ignore-next-line code-duplication -- mirrors RenewalTimingChart's own -->
        <VisCrosshair color="var(--ui-primary)" :template="template" />

        <VisTooltip />
      </VisXYContainer>
    </template>
  </StatisticsStatChartCard>
</template>
