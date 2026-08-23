<!-- app\components\finance\TypeChart.client.vue -->
<!-- Same horizontal ranking bar as FormatChart.client.vue, byType instead of
byFormat — a handful of payment-type categories compared by total incassato
(user request, 2026-08-24, following the byFormat chart). -->
<script setup lang="ts">
import { VisXYContainer, VisStackedBar, VisAxis, VisTooltip } from '@unovis/vue'
import { Orientation, StackedBar } from '@unovis/ts'
import type { FinanceTypeSummaryRow } from '~/composables/finance/useFinanceSummary'

const { rows } = defineProps<{
  rows: FinanceTypeSummaryRow[]
}>()

const { t } = useI18n()
const amountFormatter = new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' })
const { chartColor } = useChartPalette()

const grandTotal = computed(() => rows.reduce((sum, row) => sum + row.total, 0))

// Unlike byFormat, byType arrives in PAYMENT_TYPES' fixed order, not sorted
// by total — sorted ascending here so unovis' category axis (index 0 at the
// bottom) puts the longest bar at the top, same reading order as the format
// chart.
const chartRows = computed(() => [...rows].sort((a, b) => a.total - b.total))

// Keyed by type, not by position in chartRows — colors stay tied to a
// type's identity rather than its (sorted) on-screen position.
const colorByType = computed(() =>
  new Map(rows.map((row, i) => [row.type, chartColor(i)])))

const x = (_: FinanceTypeSummaryRow, i: number) => i
const y = (d: FinanceTypeSummaryRow) => d.total
// StackedBar's color accessor is called as (datum, stackIndex) — stackIndex
// is always 0 here (a single y accessor, no real stacking), so indexing by
// it would color every bar the same. Looking the color up by the row's own
// type instead gets each bar its own color regardless of which argument
// unovis passes.
const color = (row: FinanceTypeSummaryRow) => colorByType.value.get(row.type)

const yDomain = computed<[number, number]>(() => [-0.5, chartRows.value.length - 0.5])
const yTicks = (i: number) => (chartRows.value[i] ? t(PAYMENT_TYPE_LABEL_KEYS[chartRows.value[i].type]) : '')
const yTickValues = computed(() => chartRows.value.map((_, i) => i))

// 10% headroom past the longest bar — without it the top type's bar runs
// straight into the card's right edge, unreadable.
const maxTotal = computed(() => Math.max(...rows.map(row => row.total), 0))
const xDomain = computed<[number, number]>(() => [0, maxTotal.value * 1.1])

const xTicks = (value: number) => amountFormatter.format(value)

const template = (d: FinanceTypeSummaryRow) =>
  `<strong>${t(PAYMENT_TYPE_LABEL_KEYS[d.type])}</strong><br>${amountFormatter.format(d.total)}`

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
  [StackedBar.selectors.bar]: (d: { datum: FinanceTypeSummaryRow }) => template(d.datum)
}

// Same reactivity gap as FormatChart.client.vue/MonthlyTrendChart.client.vue's
// own documented fix: without a manual render nudge on mount, the
// value-scale (xScale here, since orientation is horizontal) stayed stuck at
// its stale/default domain — bars rendered with correct color and position
// but near-zero length. `:duration="0"` avoids that render fighting Vue's
// own reactive re-renders over the bars' width transition.
const containerRef = useTemplateRef('containerRef')
onMounted(() => {
  nextTick(() => containerRef.value?.component?.render(0))
})
</script>

<template>
  <StatisticsStatChartCard
    :title="t('finance.charts.byType')"
    :value="amountFormatter.format(grandTotal)"
    :caption="t('finance.summary.grandTotal')"
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
