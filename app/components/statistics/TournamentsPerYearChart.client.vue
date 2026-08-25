<!-- app\components\statistics\TournamentsPerYearChart.client.vue -->
<script setup lang="ts">
import { VisXYContainer, VisStackedBar, VisAxis, VisCrosshair, VisTooltip } from '@unovis/vue'
import type { TournamentsPerYearByFormatPoint } from '~/composables/statistics/useTournamentsStatistics'

const { t } = useI18n()

const {
  perYearByFormatSeries, byFormatSeries, tournamentsThisYear, isLoading
} = useTournamentsStatistics()
const { chartColor } = useChartPalette()

// byFormatSeries is already sorted by total count desc (see
// useTournamentsStatistics.ts) — reused here as both the stacking order and
// the legend order, so the biggest format is consistently first everywhere.
const formats = computed(() => byFormatSeries.value.map(point => point.format))
// The shared qualitative palette (useChartPalette.ts), not each format's own
// color from useFormatColor.ts — that ties a format to the same color as its
// badges elsewhere in the app, which sounds right but in practice several
// formats have no color assigned yet and all fall back to the same
// var(--ui-primary), making them indistinguishable in a stacked chart.
const colors = computed(() => formats.value.map((_, i) => chartColor(i)))
const legendItems = computed(() => formats.value.map((format, i) => ({
  name: format,
  color: chartColor(i)
})))

const x = (_: TournamentsPerYearByFormatPoint, i: number) => i
// One accessor per format — VisStackedBar stacks them in this same order.
const y = computed(() => formats.value.map(format =>
  (d: TournamentsPerYearByFormatPoint) => d.counts[format] ?? 0))

// Half a bar-slot of breathing room on each side — same reasoning as the
// other per-year charts on this page.
const xDomain = computed<[number, number]>(() => [-0.5, perYearByFormatSeries.value.length - 0.5])

const xTicks = (i: number) => perYearByFormatSeries.value[i]?.year.toString() ?? ''

// One explicit tick per year — VisAxis's default "nice number for the
// width" heuristic was skipping every other year, same fix as
// AssociatesGrowthChart.client.vue's own xTickValues.
const xTickValues = computed(() => perYearByFormatSeries.value.map((_, i) => i))

const template = (d: TournamentsPerYearByFormatPoint) => [
  `<strong>${d.year}</strong>`,
  ...formats.value
    .filter(format => d.counts[format])
    .map(format => `${format}: ${d.counts[format]}`)
].join('<br>')
</script>

<template>
  <StatisticsStatChartCard
    :title="t('statistic.charts.tournamentsPerYear')"
    :value="tournamentsThisYear"
    :caption="t('statistic.stats.tournamentsThisYear')"
    :legend-items="legendItems"
    :loading="isLoading"
  >
    <template #default="{ width }">
      <VisXYContainer
        v-if="perYearByFormatSeries.length"
        :data="perYearByFormatSeries"
        :padding="{ top: 40 }"
        :x-domain="xDomain"
        class="h-96"
        :width="width"
      >
        <VisStackedBar :x="x" :y="y" :color="colors" />

        <VisAxis
          type="x"
          :x="x"
          :tick-format="xTicks"
          :tick-values="xTickValues"
        />

        <VisCrosshair :color="colors" :template="template" />

        <VisTooltip />
      </VisXYContainer>
    </template>
  </StatisticsStatChartCard>
</template>
