<!-- app\components\finance\MonthlyTrendChart.client.vue -->
<!-- Same StatisticsStatChartCard shell as statistics/TournamentsPerYearChart.client.vue
and statistics/WantedCardsStatusChart.client.vue — x-axis is month instead of
year, series are payment types instead of formats/statuses, data is the same
byMonth rows useFinanceSummary.ts already computes for the table above (user
request, 2026-08-23, added "after the cards"). Stacked area (VisArea), not
VisStackedBar like those two — chosen once byMonth started backfilling every
month in range (same request): with a full year+ of monthly data points, a
continuous accumulated curve reads better than a wall of adjacent bars. -->
<script setup lang="ts">
import { VisXYContainer, VisArea, VisAxis, VisCrosshair, VisTooltip, VisPlotline } from '@unovis/vue'
import { format } from 'date-fns'
import { PAYMENT_TYPES } from '#shared/types/transactions'
import type { PaymentType } from '#shared/types/transactions'
import type { FinanceMonthSummaryRow } from '~/composables/finance/useFinanceSummary'

// fallow-ignore-next-line code-duplication -- see the same comment in
// FormatChart.client.vue
const { rows, loading = false } = defineProps<{
  rows: FinanceMonthSummaryRow[]
  loading?: boolean
}>()

const { t } = useI18n()

const amountFormatter = AMOUNT_FORMATTER

const { chartColor } = useChartPalette()

const grandTotal = computed(() => columnTotal(rows, 'grandTotal'))

// Running total per type, not each month's own amount (user request,
// 2026-08-23: "curves should be cumulative, not point-in-time") — the table
// above keeps showing per-month totals, only the chart accumulates.
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

// Gradient fill per series (user request, 2026-08-23, referencing
// nuxtcharts.com's area chart style) — solid color fading to transparent
// top-to-bottom, injected via VisXYContainer's svgDefs (raw SVG markup, the
// only way unovis takes a gradient: its `color` accessors only accept a
// solid CSS color/string, not a gradient definition inline). `chartColor(0)`
// is `var(--ui-primary)`, still valid inside an SVG stop-color attribute.
// legendItems/VisCrosshair keep the solid chartColor() — a legend swatch or
// crosshair line rendered as a gradient reads worse than a flat color.
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

// Dashed vertical marker at the current month (user request, 2026-08-23) —
// no such marker existed anywhere in app/components/statistics to copy from
// (checked, none of those charts have one), built fresh with VisPlotline.
// -1 (not found) happens when today's month falls outside the backfilled
// range (e.g. very old/only-future data) — the v-if on the template guards
// against drawing a plotline at an invalid position.
const todayIndex = computed(() => rows.findIndex(row => row.month === format(new Date(), 'yyyy-MM')))

// One explicit tick per month up to a year, then thinning out — same
// reasoning/thresholds as WantedCardsStatusChart.client.vue's own
// xTickValues (VisAxis's default tick heuristic skips entries unpredictably
// once there are more than a handful of months).
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

// Two separate unovis/Vue-wrapper issues, both confirmed by inspecting the
// live component instance via devtools rather than guessing:
//
// 1. Without a manual render nudge on mount, VisArea's own x/y scale stayed
//    stuck at d3's default [0,1] domain (config/data were both already
//    correct; the area rendered at degenerate, invisible coordinates)
//    instead of picking up xDomain — the container's reactive update path
//    was silently skipping the scale recompute. A :key remount was tried
//    first and did NOT fix it (rows.length never actually changes across
//    renders here). Calling the exposed container instance's own .render()
//    once after mount forces that recompute.
//
// 2. `:duration="0"` on the container: with a real transition duration,
//    that manual render (and Vue's own subsequent reactive re-renders)
//    fight over the same elements' opacity, which got caught stuck
//    mid-fade at a near-zero value (confirmed via devtools: paths existed
//    with correct geometry but a static, non-animating `opacity: 0.0067`,
//    ruling out a merely-slow transition). Instant, non-transitioned
//    renders sidestep the fight entirely.
//
// Same "reactivity gap" class of bug AgeDistributionChart.client.vue's own
// comment already flagged elsewhere in this library, here hitting the scale
// and the transition instead of the data path.
// watch on `loading`, not onMounted — see FormatChart.client.vue's own
// comment for why (the container is hidden behind the loading skeleton
// until then, so waiting for mount alone would miss the real chart's
// first render).
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
