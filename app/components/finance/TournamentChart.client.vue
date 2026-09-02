<!-- app\components\finance\TournamentChart.client.vue -->
<!-- Line+scatter, one point per tournament, one line per format — merges
TournamentTrendChart.client.vue (revenue) and
TournamentParticipantsChart.client.vue (participants) into a single
always-mounted chart driven by a `metric` prop, rather than two separate
components toggled with v-if. Switching components would unmount/remount the
whole VisXYContainer, so unovis has nothing to interpolate from — the lines
would just snap. Keeping one container alive and only changing its y
accessor/data-derived value lets unovis actually animate each line/point to
its new position (user request, 2026-09-03: "voglio animare le linee").

Deliberately no `:data` on <VisXYContainer> — @unovis/vue's per-component
data resolves as `container.data ?? ownData` (components/line/index.js),
so any truthy container-level data makes every child ignore its own `:data`
prop entirely (confirmed live via devtools: all 5 <VisLine>s rendered the
identical container-wide path, just stacked in different colors). Leaving
the container's data unset lets each component fall through to its own
`:data` below — <VisLine> gets its own per-format, date-sorted subset,
<VisScatter> gets the full sorted set.

An earlier attempt fed all 5 lines the same shared full dataset with a
per-format y accessor returning `undefined` for other formats' rows (relying
on Line's `fallbackValue` gap-breaking). That produced a real bug of its
own: Line's gap-optimizer only draws an `L`-connected run between two
consecutive *defined* points in the underlying array — since tournaments of
the same format are essentially never adjacent once sorted by date (some
other format's tournament almost always falls between them), every point
ended up flagged as its own isolated gap endpoint, rendering as disconnected
`M x,y Z` dots with no visible line at all. Giving each <VisLine> its own
already-filtered array (only that format's rows, already contiguous)
sidesteps the gap-optimizer entirely. -->
<script setup lang="ts">
import { eachMonthOfInterval, endOfYear, format as formatDate, startOfYear } from 'date-fns'
import { VisXYContainer, VisLine, VisScatter, VisAxis, VisTooltip } from '@unovis/vue'
import { Scatter } from '@unovis/ts'
import type { FinanceTournamentSummaryRow } from '~/composables/finance/useFinanceSummary'

const {
  rows, year, metric, loading = false
} = defineProps<{
  rows: FinanceTournamentSummaryRow[]
  year: number
  metric: 'participants' | 'revenue'
  loading?: boolean
}>()

const { t } = useI18n()
const amountFormatter = AMOUNT_FORMATTER
const { chartColor } = useChartPalette()

const title = computed(() => metric === 'participants'
  ? t('finance.charts.participantsTrend')
  : t('finance.charts.tournamentTrend'))
const value = computed(() => metric === 'participants'
  ? columnTotal(rows, 'count')
  : amountFormatter.format(columnTotal(rows, 'total')))
const caption = computed(() => metric === 'participants'
  ? t('finance.charts.totalParticipants')
  : t('finance.summary.grandTotal'))

const chartRows = computed(() =>
  [...rows].sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()))

// Stable order (first appearance in rows), not sorted by total — this is a
// timeline, not a ranking, so the color legend follows whichever order
// formats first show up rather than a size-based one.
const formats = computed(() => [...new Set(chartRows.value.map(row => row.format))])
const colorByFormat = computed(() =>
  new Map(formats.value.map((format, i) => [format, chartColor(i)])))

const rowsByFormat = computed(() => {
  const byFormat = new Map<string, FinanceTournamentSummaryRow[]>()
  for (const format of formats.value) {
    byFormat.set(format, chartRows.value.filter(row => row.format === format))
  }
  return byFormat
})

const legendItems = computed(() => formats.value.map((format, i) => ({
  name: format,
  color: chartColor(i)
})))

// Real dates as numeric epoch values, not an index — the actual gaps
// between tournaments (weeks apart, unevenly spaced) matter here, unlike
// the evenly-bucketed month/format/type charts elsewhere on this page.
const x = (row: FinanceTournamentSummaryRow) => new Date(row.startDate).getTime()
// Reads `metric` fresh on every call (Vue 3.5 reactive-prop-destructure
// transform rewrites the bare reference to __props.metric everywhere in
// this file, not just inside computed()) — switching metric re-evaluates y
// for the existing points, which is exactly what lets unovis animate them
// to their new position instead of remounting.
const y = (row: FinanceTournamentSummaryRow) => (metric === 'participants' ? row.count : row.total)
const color = (row: FinanceTournamentSummaryRow) => colorByFormat.value.get(row.format)

const xTicks = (value: number) => formatDate(new Date(value), 'MMM yyyy')
// Participants are a whole-number count — a fractional y tick (e.g. "3.5")
// would misread as a real half-participant rather than just axis rounding.
// Revenue keeps VisAxis's own default formatter (undefined tick-format).
const yTicks = computed(() => (metric === 'participants'
  ? (raw: number) => Math.round(raw).toString()
  : undefined))

// Spans the whole selected `year` (Jan 1 - Dec 31), same convention as
// byMonth's own backfill (useFinanceSummary.ts) — keyed off the year
// switcher, not the real "today", so past years show their own full season
// instead of getting cut off at wherever "today" happens to fall.
const xDomain = computed<[number, number]>(() => {
  const yearAnchor = new Date(year, 0, 1)
  return [startOfYear(yearAnchor).getTime(), endOfYear(yearAnchor).getTime()]
})

// One tick per calendar month across the whole domain — VisAxis's default
// "nice number for the width" heuristic only labelled a handful of
// arbitrary months, same fix as the other per-period charts on this page.
const xTickValues = computed(() => eachMonthOfInterval({
  start: new Date(xDomain.value[0]),
  end: new Date(xDomain.value[1])
}).map(date => date.getTime()))

const template = (row: FinanceTournamentSummaryRow) => [
  `<strong>${row.name}</strong>`,
  `${row.format} · ${formatDate(new Date(row.startDate), 'd MMM yyyy')}`,
  metric === 'participants'
    ? t('finance.charts.participantsCount', { count: row.count })
    // compedCount is a subset of count (free entries, see
    // FinanceTournamentSummaryRow's own comment) — count - compedCount is
    // how many actually paid, out of the tournament's total entries (user
    // request, 2026-09-03).
    : `${amountFormatter.format(row.total)} ${t('finance.charts.payingCount', {
      paying: row.count - row.compedCount,
      total: row.count
    })}`
].join('<br>')

// VisCrosshair never picked up a valid position on this chart despite
// explicit x/y accessors (confirmed live via devtools: hovering never
// rendered a tooltip). VisTooltip's own `triggers` config, keyed by
// Scatter's own point selector, fires directly off the point elements
// instead — same fix as FormatChart.client.vue/TypeChart.client.vue, and
// the pattern unovis' own docs recommend. Scatter binds each point's own
// row object directly (augmented with an internal `_point` field, not
// wrapped like StackedBar's bars), so no unwrapping is needed here.
const triggers = {
  [Scatter.selectors.point]: (row: FinanceTournamentSummaryRow) => template(row)
}

// Same reactivity gap as FormatChart.client.vue/TypeChart.client.vue's own
// documented fix — a manual render nudge on mount avoids the scale getting
// stuck at its default/stale domain. Explicit 0 here (not the container's
// own animated :duration below) so the very first real paint snaps in
// instantly instead of growing from empty — only a later metric switch
// should animate.
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
    :title="title"
    :value="value"
    :caption="caption"
    :legend-items="legendItems"
    :loading="loading"
  >
    <template #default="{ width }">
      <VisXYContainer
        v-if="chartRows.length"
        ref="containerRef"
        :x-domain="xDomain"
        :padding="{ top: 40, left: 8, right: 8 }"
        :duration="400"
        class="h-96"
        :width="width"
      >
        <VisLine
          v-for="format in formats"
          :key="format"
          :data="rowsByFormat.get(format)"
          :x="x"
          :y="y"
          :color="colorByFormat.get(format)"
        />

        <VisScatter
          :data="chartRows"
          :x="x"
          :y="y"
          :color="color"
        />

        <VisAxis
          type="x"
          :x="x"
          :tick-format="xTicks"
          :tick-values="xTickValues"
        />
        <VisAxis
          type="y"
          :tick-format="yTicks"
        />

        <VisTooltip :triggers="triggers" />
      </VisXYContainer>
    </template>
  </StatisticsStatChartCard>
</template>
