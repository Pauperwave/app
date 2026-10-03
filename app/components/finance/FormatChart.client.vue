<!-- app\components\finance\FormatChart.client.vue -->
<!-- Horizontal ranking bar, not the vertical/time-series shape of the other charts: byFormat has no
     time axis, it is a handful of categories (Pauper, Commander, ...) compared by total incassato,
     which reads better as a ranked bar. Same StatisticsStatChartCard shell as the rest, a single
     VisStackedBar with one y accessor (not actually stacked: StackedBar is reused only for its
     `orientation: 'horizontal'`, as unovis has no plain single-series Bar component). -->
<script setup lang="ts">
import { VisXYContainer, VisStackedBar, VisAxis, VisTooltip } from '@unovis/vue'
import { Orientation, StackedBar } from '@unovis/ts'
import type { FinanceFormatSummaryRow } from '~/composables/finance/useFinanceSummary'

// fallow-ignore-next-line code-duplication -- scaffolding mirrors every finance chart
const { rows, loading = false } = defineProps<{
  rows: FinanceFormatSummaryRow[]
  loading?: boolean
}>()

const { t } = useI18n()
const amountFormatter = AMOUNT_FORMATTER
const { chartColor } = useChartPalette()

const grandTotal = computed(() => columnTotal(rows, 'total'))

// rows arrives sorted by total desc (useFinanceSummary.ts). unovis' category axis renders index 0
// at the bottom, which put the longest bar at the bottom: reversed here so the longest reads first,
// top to bottom
const chartRows = computed(() => [...rows].reverse())

// Keyed by format, not by position in chartRows — colors stay tied to a
// format's identity rather than its (now-reversed) on-screen position.
const colorByFormat = computed(() =>
  new Map(rows.map((row, i) => [row.format, chartColor(i)])))

const x = (_: FinanceFormatSummaryRow, i: number) => i
const y = (d: FinanceFormatSummaryRow) => d.total
// StackedBar's color accessor is called as (datum, stackIndex), and stackIndex is always 0 here (a
// single y accessor, no real stacking): indexing by it would color every bar the same. Looking the
// color up by the row's format gives each bar its own
const color = (row: FinanceFormatSummaryRow) => colorByFormat.value.get(row.format)

// Half a bar-slot of breathing room on each side of the categorical axis, which is yDomain here
// (StackedBar's `dataScale`, fed by config.x/the index accessor, maps to yScale once horizontal)
const yDomain = computed<[number, number]>(() => [-0.5, chartRows.value.length - 0.5])
const yTicks = (i: number) => chartRows.value[i]?.format ?? ''
const yTickValues = computed(() => chartRows.value.map((_, i) => i))

// 10% headroom past the longest bar: without it the top format's bar runs into the card's right
// edge
const maxTotal = computed(() => Math.max(...rows.map(row => row.total), 0))
const xDomain = computed<[number, number]>(() => [0, maxTotal.value * 1.1])

// The value axis (x, once horizontal) defaults to unovis' d3.format('.2s')-ish ticks, plain numbers
// without currency, misleading on a euro chart
const xTicks = (value: number) => amountFormatter.format(value)

const template = (d: FinanceFormatSummaryRow) =>
  `<strong>${d.format}</strong><br>${amountFormatter.format(d.total)}`

// VisCrosshair never picked up a valid position here (no x/y accessors of its own, and unovis
// doesn't reliably inherit them from sibling components on a horizontal bar): hovering never showed
// a tooltip. VisTooltip's `triggers`, keyed by StackedBar's bar selector, fires off the bar
// elements instead (the pattern unovis' docs recommend for bar charts). The trigger's datum is
// StackedBar's internal per-bar wrapper (see components/stacked-bar/index.js's `bars` data join),
// not the row: `.datum` unwraps it
const triggers = {
  [StackedBar.selectors.bar]: (d: { datum: FinanceFormatSummaryRow }) => template(d.datum)
}

// Same reactivity gap as MonthlyTrendChart.client.vue: without a manual render nudge on mount the
// value scale (xScale here, once horizontal) stayed at its stale domain, rendering bars with
// near-zero length. `:duration="0"` avoids that render fighting Vue's reactive re-renders over the
// bars' width transition. Watches `loading`, not onMounted: the container is hidden behind
// StatisticsStatChartCard's loading skeleton until `loading` goes false, so mount alone would fire
// the nudge while containerRef is still null and never re-fire once the real chart appears
const containerRef = useTemplateRef('containerRef')
watch(() => loading, (isLoading) => {
  if (!isLoading) nextTick(() => containerRef.value?.component?.render(0))
}, { immediate: true })
</script>

<template>
  <StatisticsStatChartCard
    :title="t('finance.charts.byFormat')"
    :value="amountFormatter.format(grandTotal)"
    :caption="t('finance.summary.grandTotal')"
    :loading="loading"
  >
    <template #default="{ width }">
      <!-- fallow-ignore-next-line code-duplication -- mirrors TypeChart.client.vue's own -->
      <VisXYContainer
        v-if="chartRows.length"
        ref="containerRef"
        :data="chartRows"
        :padding="{ right: 24 }"
        :x-domain="xDomain"
        :y-domain="yDomain"
        :duration="0"
        class="h-96"
        :width="width"
      >
        <VisStackedBar
          :x="x"
          :y="y"
          :color="color"
          :orientation="Orientation.Horizontal"
        />

        <VisAxis
          type="y"
          :x="x"
          :tick-format="yTicks"
          :tick-values="yTickValues"
        />
        <VisAxis type="x" :tick-format="xTicks" />

        <VisTooltip :triggers="triggers" />
      </VisXYContainer>
    </template>
  </StatisticsStatChartCard>
</template>
