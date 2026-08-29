<!-- app\components\finance\FormatChart.client.vue -->
<!-- Horizontal ranking bar, not the vertical/time-series shape every other
chart on this page and /statistics uses — byFormat has no time axis, it's a
handful of categories (Pauper, Commander, ...) compared by total incassato,
which reads better as a ranked bar than a line/area (user request,
2026-08-23). Same StatisticsStatChartCard shell as the rest, single
VisStackedBar with one y accessor (not actually stacked — reusing StackedBar
purely for its `orientation: 'horizontal'` support, unovis has no plain
single-series Bar component). -->
<script setup lang="ts">
import { VisXYContainer, VisStackedBar, VisAxis, VisTooltip } from '@unovis/vue'
import { Orientation, StackedBar } from '@unovis/ts'
import type { FinanceFormatSummaryRow } from '~/composables/finance/useFinanceSummary'

const { rows, loading = false } = defineProps<{
  rows: FinanceFormatSummaryRow[]
  loading?: boolean
}>()

const { t } = useI18n()
const amountFormatter = AMOUNT_FORMATTER
const { chartColor } = useChartPalette()

const grandTotal = computed(() => rows.reduce((sum, row) => sum + row.total, 0))

// rows arrives sorted by total desc (useFinanceSummary.ts). unovis' category
// axis renders index 0 at the bottom, so feeding it in that order put the
// longest bar at the bottom — reversed here so the longest bar reads first,
// top to bottom (user request, 2026-08-23).
const chartRows = computed(() => [...rows].reverse())

// Keyed by format, not by position in chartRows — colors stay tied to a
// format's identity rather than its (now-reversed) on-screen position.
const colorByFormat = computed(() =>
  new Map(rows.map((row, i) => [row.format, chartColor(i)])))

const x = (_: FinanceFormatSummaryRow, i: number) => i
const y = (d: FinanceFormatSummaryRow) => d.total
// StackedBar's color accessor is called as (datum, stackIndex) — stackIndex
// is always 0 here (a single y accessor, no real stacking), so indexing by
// it would color every bar the same. Looking the color up by the row's own
// format instead gets each bar its own color regardless of which argument
// unovis passes.
const color = (row: FinanceFormatSummaryRow) => colorByFormat.value.get(row.format)

// Half a bar-slot of breathing room on each side, on the categorical axis —
// which is yDomain here, not xDomain, since StackedBar's `dataScale` (the
// one config.x/the index accessor feeds) maps to yScale once orientation is
// horizontal.
const yDomain = computed<[number, number]>(() => [-0.5, chartRows.value.length - 0.5])
const yTicks = (i: number) => chartRows.value[i]?.format ?? ''
const yTickValues = computed(() => chartRows.value.map((_, i) => i))

// 10% headroom past the longest bar — without it the top format's bar runs
// straight into the card's right edge, unreadable (user request,
// 2026-08-23).
const maxTotal = computed(() => Math.max(...rows.map(row => row.total), 0))
const xDomain = computed<[number, number]>(() => [0, maxTotal.value * 1.1])

// Value axis (x, once horizontal) defaults to unovis' own d3.format('.2s')-ish
// tick formatting — plain numbers with no currency, misleading on a euro
// chart (user request, 2026-08-23).
const xTicks = (value: number) => amountFormatter.format(value)

const template = (d: FinanceFormatSummaryRow) =>
  `<strong>${d.format}</strong><br>${amountFormatter.format(d.total)}`

// VisCrosshair never picked up a valid position on this chart (it has no
// x/y accessors of its own and unovis doesn't reliably inherit them from
// sibling components on a horizontal bar) — confirmed live via devtools:
// hovering never rendered a tooltip. VisTooltip's own `triggers` config,
// keyed by StackedBar's own bar selector, fires directly off the bar
// elements instead — the pattern unovis' own docs recommend for bar charts.
// The trigger's datum is StackedBar's internal per-bar wrapper (see
// components/stacked-bar/index.js's `bars` data join), not the row itself —
// `.datum` unwraps it.
const triggers = {
  [StackedBar.selectors.bar]: (d: { datum: FinanceFormatSummaryRow }) => template(d.datum)
}

// Same reactivity gap as MonthlyTrendChart.client.vue's own documented fix:
// without a manual render nudge on mount, the value-scale (xScale here,
// since orientation is horizontal) stayed stuck at its stale/default domain
// — bars rendered with correct color and position but near-zero length.
// `:duration="0"` avoids that render fighting Vue's own reactive re-renders
// over the bars' width transition.
// watch on `loading`, not onMounted — the container is hidden behind
// StatisticsStatChartCard's loading skeleton until `loading` goes false, so
// waiting for mount alone would fire this nudge while containerRef is still
// null (the skeleton, not VisXYContainer, is what actually mounted) and
// never re-fire once the real chart appears (2026-08-26 fix).
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
