<!-- app\components\finance\TypeChart.client.vue -->
<!-- Same horizontal ranking bar as FormatChart.client.vue, by payment type instead of format: a
     handful of categories compared by total incassato -->
<script setup lang="ts">
import { VisXYContainer, VisStackedBar, VisAxis, VisTooltip } from '@unovis/vue'
import { Orientation, StackedBar } from '@unovis/ts'
import type { FinanceTypeSummaryRow } from '~/composables/finance/useFinanceSummary'

// fallow-ignore-next-line code-duplication -- see the same comment in FormatChart.client.vue
const { rows, loading = false } = defineProps<{
  rows: FinanceTypeSummaryRow[]
  loading?: boolean
}>()

const { t } = useI18n()
const amountFormatter = AMOUNT_FORMATTER
const { chartColor } = useChartPalette()

const grandTotal = computed(() => columnTotal(rows, 'total'))

// Unlike byFormat, byType arrives in PAYMENT_TYPES' fixed order, not sorted by total: sorted
// ascending here so unovis' category axis (index 0 at the bottom) puts the longest bar on top, like
// the format chart
const chartRows = computed(() => [...rows].sort((a, b) => a.total - b.total))

// Keyed by type, not by position in chartRows — colors stay tied to a
// type's identity rather than its (sorted) on-screen position.
const colorByType = computed(() =>
  new Map(rows.map((row, i) => [row.type, chartColor(i)])))

const x = (_: FinanceTypeSummaryRow, i: number) => i
const y = (d: FinanceTypeSummaryRow) => d.total
// StackedBar's color accessor is called as (datum, stackIndex), and stackIndex is always 0 here (a
// single y accessor, no real stacking): indexing by it would color every bar the same. Looking the
// color up by the row's type gives each bar its own
const color = (row: FinanceTypeSummaryRow) => colorByType.value.get(row.type)

const yDomain = computed<[number, number]>(() => [-0.5, chartRows.value.length - 0.5])
const yTicks = (i: number) => (chartRows.value[i] ? t(PAYMENT_TYPE_LABEL_KEYS[chartRows.value[i].type]) : '')
const yTickValues = computed(() => chartRows.value.map((_, i) => i))

// 10% headroom past the longest bar — without it the top type's bar runs
// straight into the card's right edge, unreadable.
// fallow-ignore-next-line code-duplication -- see the same comment in FormatChart.client.vue
const maxTotal = computed(() => Math.max(...rows.map(row => row.total), 0))
const xDomain = computed<[number, number]>(() => [0, maxTotal.value * 1.1])

const xTicks = (value: number) => amountFormatter.format(value)

const template = (d: FinanceTypeSummaryRow) =>
  `<strong>${t(PAYMENT_TYPE_LABEL_KEYS[d.type])}</strong><br>${amountFormatter.format(d.total)}`

// VisCrosshair never picked up a valid position here (no x/y accessors of its own, and unovis
// doesn't reliably inherit them from sibling components on a horizontal bar): hovering never showed
// a tooltip. VisTooltip's `triggers`, keyed by StackedBar's bar selector, fires off the bar
// elements instead (the pattern unovis' docs recommend for bar charts). The trigger's datum is
// StackedBar's internal per-bar wrapper (see components/stacked-bar/index.js's `bars` data join),
// not the row: `.datum` unwraps it
const triggers = {
  [StackedBar.selectors.bar]: (d: { datum: FinanceTypeSummaryRow }) => template(d.datum)
}

// Same reactivity gap as FormatChart.client.vue/MonthlyTrendChart.client.vue: without a manual
// render nudge on mount the value scale (xScale here, once horizontal) stayed at its stale domain,
// rendering bars with near-zero length. `:duration="0"` avoids that render fighting Vue's reactive
// re-renders over the bars' width transition. Watches `loading`, not onMounted (see
// FormatChart.client.vue): the container is hidden behind the loading skeleton until then, so mount
// alone would miss the real chart's first render
const containerRef = useTemplateRef('containerRef')
watch(() => loading, (isLoading) => {
  if (!isLoading) nextTick(() => containerRef.value?.component?.render(0))
}, { immediate: true })
</script>

<template>
  <StatisticsStatChartCard
    :title="t('finance.charts.byType')"
    :value="amountFormatter.format(grandTotal)"
    :caption="t('finance.summary.grandTotal')"
    :loading="loading"
  >
    <template #default="{ width }">
      <!-- fallow-ignore-next-line code-duplication -- see FormatChart.client.vue -->
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
