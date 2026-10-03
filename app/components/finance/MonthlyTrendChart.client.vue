<!-- app\components\finance\MonthlyTrendChart.client.vue -->
<!-- Same StatisticsStatChartCard shell as statistics/TournamentsPerYearChart.client.vue and
     statistics/WantedCardsStatusChart.client.vue: x-axis is month, series are payment types, data
     is the byMonth rows useFinanceSummary.ts computes for the table above. Stacked area (VisArea),
     not VisStackedBar like those two: with byMonth backfilling every month in range, a continuous
     accumulated curve reads better than a wall of adjacent bars. -->
<script setup lang="ts">
import { VisXYContainer, VisArea, VisAxis, VisCrosshair, VisTooltip, VisPlotline } from '@unovis/vue'
import { format } from 'date-fns'
import { PAYMENT_TYPES } from '#shared/types/transactions'
import type { PaymentType } from '#shared/types/transactions'
import type { FinanceMonthSummaryRow } from '~/composables/finance/useFinanceSummary'

// fallow-ignore-next-line code-duplication -- see the same comment in FormatChart.client.vue
const { rows, loading = false } = defineProps<{
  rows: FinanceMonthSummaryRow[]
  loading?: boolean
}>()

const { t } = useI18n()

const amountFormatter = AMOUNT_FORMATTER

const { chartColor } = useChartPalette()

const grandTotal = computed(() => columnTotal(rows, 'grandTotal'))

// Running total per type, not each month's own amount ("curves should be cumulative"): the table
// above shows per-month totals, only the chart accumulates
const cumulativeRows = computed(() => {
  const running = Object.fromEntries(
    PAYMENT_TYPES.map(type => [type, 0])
  ) as Record<PaymentType, number>
  return rows.map((row) => {
    for (const type of PAYMENT_TYPES) running[type] += row.totals[type]
    const totals = { ...running }
    const grandTotal = PAYMENT_TYPES.reduce((sum, type) => sum + totals[type], 0)
    return { ...row, totals, grandTotal }
  })
})

// Gradient fill per series (like nuxtcharts.com's area chart): solid color fading to transparent
// top-to-bottom, injected via VisXYContainer's svgDefs (raw SVG markup, the only way unovis takes a
// gradient: its `color` accessors only accept a solid CSS color). `chartColor(0)` is
// `var(--ui-primary)`, valid in an SVG stop-color. legendItems/VisCrosshair keep the solid
// chartColor(): a gradient swatch or crosshair line reads worse
const gradientId = (i: number) => `finance-monthly-trend-gradient-${i}`
const svgDefs = computed(() => PAYMENT_TYPES.map((_, i) => `
  <linearGradient id="${gradientId(i)}" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stop-color="${chartColor(i)}" stop-opacity="0.5" />
    <stop offset="100%" stop-color="${chartColor(i)}" stop-opacity="0" />
  </linearGradient>
`).join(''))

const colors = PAYMENT_TYPES.map((_, i) => `url(#${gradientId(i)})`)
const lineColors = PAYMENT_TYPES.map((_, i) => chartColor(i))
const legendItems = computed(() => PAYMENT_TYPES.map((type, i) => ({
  name: t(PAYMENT_TYPE_LABEL_KEYS[type]),
  color: chartColor(i)
})))

const x = (_: FinanceMonthSummaryRow, i: number) => i
// One accessor per payment type — VisArea stacks them in this order, same as
// VisStackedBar did.
const y = PAYMENT_TYPES.map(type => (d: FinanceMonthSummaryRow) => d.totals[type])

// Half a bar-slot of breathing room on each side — same reasoning as the
// other per-period charts on /statistics.
const xDomain = computed<[number, number]>(() => [-0.5, rows.length - 0.5])

const xTicks = (i: number) => rows[i]?.label ?? ''

// Dashed vertical marker at the current month, built with VisPlotline (no chart in
// app/components/statistics has one). -1 (not found) happens when today's month falls outside the
// backfilled range; the template's v-if guards against an invalid position
const todayIndex = computed(() => rows.findIndex(row => row.month === format(new Date(), 'yyyy-MM')))

// One explicit tick per month up to a year, then thinning out (like
// WantedCardsStatusChart.client.vue's xTickValues): VisAxis's default tick heuristic skips entries
// unpredictably past a handful of months
const xTickValues = computed(() => {
  const step = rows.length <= 12 ? 1 : rows.length <= 24 ? 2 : 3
  return rows.map((_, i) => i).filter(i => i % step === 0)
})

const template = (d: FinanceMonthSummaryRow) => [
  `<strong>${d.label}</strong>`,
  ...PAYMENT_TYPES
    .filter(type => d.totals[type])
    .map(type => `${t(PAYMENT_TYPE_LABEL_KEYS[type])}: ${amountFormatter.format(d.totals[type])}`)
].join('<br>')

// Two separate unovis/Vue-wrapper issues, both confirmed by inspecting the live component instance:
//
// 1. Without a manual render nudge on mount, VisArea's x/y scale stayed at d3's default [0,1]
//    domain (config/data were correct, the area rendered at degenerate invisible coordinates)
//    instead of picking up xDomain:
//    the container's reactive update path skipped the scale recompute. A :key remount did NOT fix
//    it (rows.length never changes across renders). Calling the exposed container's .render() once
//    after mount forces it.
//
// 2. `:duration="0"` on the container: with a real transition, that manual render and Vue's
//    reactive re-renders fight over the same elements' opacity, which got stuck mid-fade (static
//    `opacity: 0.0067`, ruling out a slow
//    transition). Instant renders sidestep it.
//
// The same "reactivity gap" class as AgeDistributionChart.client.vue's comment, here hitting the
// scale and the transition instead of the data path. Watches `loading`, not onMounted (see
// FormatChart.client.vue): the container is hidden behind the loading skeleton until then, so mount
// alone would miss the real chart's first render
const containerRef = useTemplateRef('containerRef')
watch(() => loading, (isLoading) => {
  if (!isLoading) nextTick(() => containerRef.value?.component?.render(0))
}, { immediate: true })
</script>

<template>
  <StatisticsStatChartCard
    :title="t('finance.charts.monthlyTrend')"
    :value="amountFormatter.format(grandTotal)"
    :caption="t('finance.summary.grandTotal')"
    :legend-items="legendItems"
    :loading="loading"
  >
    <template #default="{ width }">
      <VisXYContainer
        v-if="rows.length"
        ref="containerRef"
        :data="cumulativeRows"
        :padding="{ top: 40 }"
        :x-domain="xDomain"
        :svg-defs="svgDefs"
        :duration="0"
        class="h-96"
        :width="width"
      >
        <VisArea
          :x="x"
          :y="y"
          :color="colors"
          line
          :line-color="lineColors"
        />

        <VisAxis
          type="x"
          :x="x"
          :tick-format="xTicks"
          :tick-values="xTickValues"
        />

        <VisPlotline
          v-if="todayIndex !== -1"
          axis="x"
          :value="todayIndex"
          line-style="dash"
          color="var(--ui-text-dimmed)"
          :label-text="t('finance.charts.today')"
          :exclude-from-domain-calculation="true"
        />

        <VisCrosshair :color="lineColors" :template="template" />

        <VisTooltip />
      </VisXYContainer>
    </template>
  </StatisticsStatChartCard>
</template>
