<!-- app\components\tournaments\single\prizes\PrizeDistributionChart.client.vue -->
<!--
  Placement -> suggested packs histogram, same VisXYContainer/VisGroupedBar
  structure as AgeDistributionChart.client.vue, without the KDE overlay
  (there's no continuous distribution to smooth here, just per-rank bars).
-->
<script setup lang="ts">
import {
  VisXYContainer, VisGroupedBar, VisAxis, VisCrosshair, VisPlotline, VisTooltip
} from '@unovis/vue'
import { PlotlineLabelPosition, PlotlineLineStylePresets } from '@unovis/ts'

interface PrizeChartPoint {
  rank: number
  label: string
  packs: number
}

const { rows, guides } = defineProps<{
  rows: Array<{ label: string, packs: number }>
  // Horizontal reference lines for the settings (packs); null/0 = not drawn
  guides: {
    minPacks: number
    nonRewardedMinPacks: number
    maxPacks: number | null
  }
}>()

const { t } = useI18n()

const chartData = computed<PrizeChartPoint[]>(() =>
  rows.map((row, index) => ({ rank: index + 1, label: row.label, packs: row.packs })))

const x = (_: PrizeChartPoint, i: number) => i
const y = (d: PrizeChartPoint) => d.packs

const xDomain = computed<[number, number]>(() => [-0.5, chartData.value.length - 0.5])
const xTickValues = computed(() => chartData.value.map((_, index) => index))
const xTicks = (i: number) => chartData.value[i]?.rank.toString() ?? ''
const lines = computed(() => {
  const result: Array<{
    key: string
    value: number
    label: string
    color: string
    position: PlotlineLabelPosition
  }> = []

  if (guides.minPacks > 0) {
    result.push({
      key: 'min',
      value: guides.minPacks,
      label: t('tournament.single.prizeDistribution.chartLines.min', { count: guides.minPacks }),
      color: 'var(--ui-success)',
      position: PlotlineLabelPosition.TopLeft
    })
  }

  if (guides.nonRewardedMinPacks > 0) {
    result.push({
      key: 'nonRewardedMin',
      value: guides.nonRewardedMinPacks,
      label: t('tournament.single.prizeDistribution.chartLines.nonRewardedMin', {
        count: guides.nonRewardedMinPacks
      }),
      color: 'var(--ui-info)',
      position: PlotlineLabelPosition.TopRight
    })
  }

  if (guides.maxPacks !== null) {
    result.push({
      key: 'cap',
      value: guides.maxPacks,
      label: t('tournament.single.prizeDistribution.chartLines.cap', { count: guides.maxPacks }),
      color: 'var(--ui-warning)',
      position: PlotlineLabelPosition.TopRight
    })
  }

  return result
})

// The lines must fit the axis even when they sit above the tallest bar
const yMax = computed(() => Math.max(
  0,
  ...chartData.value.map(point => point.packs),
  ...lines.value.map(line => line.value)
))
const yDomain = computed<[number, number]>(() => [0, yMax.value])

// Whole packs only: one tick (and grid line) per integer from 0 to the max
const yTickValues = computed(() => Array.from({ length: yMax.value + 1 }, (_, value) => value))

const template = (d: PrizeChartPoint) =>
  t('tournament.single.prizeDistribution.chartTooltip', { rank: d.rank, label: d.label, packs: d.packs }, d.packs)
</script>

<template>
  <VisXYContainer
    v-if="chartData.length"
    :data="chartData"
    :padding="{ top: 20 }"
    :x-domain="xDomain"
    :y-domain="yDomain"
    class="prize-chart size-full min-h-40"
  >
    <VisGroupedBar
      :x="x"
      :y="y"
      color="var(--ui-primary)"
    />

    <VisAxis
      type="x"
      :x="x"
      :tick-values="xTickValues"
      :tick-format="xTicks"
      :label="t('tournament.single.prizeDistribution.chartAxisX')"
    />

    <VisAxis
      type="y"
      :tick-values="yTickValues"
      :label="t('tournament.single.prizeDistribution.chartAxisY')"
    />

    <VisPlotline
      v-for="line in lines"
      :key="line.key"
      axis="y"
      :value="line.value"
      :color="line.color"
      :line-width="1.5"
      :line-style="PlotlineLineStylePresets.Dash"
      :label-text="line.label"
      :label-position="line.position"
      :label-color="line.color"
    />

    <VisCrosshair color="var(--ui-primary)" :template="template" />

    <VisTooltip />
  </VisXYContainer>
</template>

<style scoped>
.prize-chart {
  --vis-crosshair-line-stroke-color: var(--ui-primary);
  --vis-crosshair-circle-stroke-color: var(--ui-bg);

  --vis-axis-grid-color: var(--ui-border-muted);
  --vis-axis-tick-color: var(--ui-border-muted);
  --vis-axis-tick-label-color: var(--ui-text-dimmed);

  --vis-tooltip-background-color: var(--ui-bg);
  --vis-tooltip-border-color: var(--ui-border);
  --vis-tooltip-text-color: var(--ui-text-highlighted);
}
</style>
