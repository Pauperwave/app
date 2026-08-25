<!-- app\components\statistics\WantedCardsStatusChart.client.vue -->
<script setup lang="ts">
import { format } from 'date-fns'
import { VisXYContainer, VisStackedBar, VisAxis, VisCrosshair, VisTooltip } from '@unovis/vue'
import type { WantedCardsStatusOverTimePoint } from '~/composables/statistics/useWantedCardsStatistics'
import type { WantedCardStatus } from '~/types'

const { t } = useI18n()

const { statusOverTimeSeries, statusBreakdown, isLoading } = useWantedCardsStatistics()
const { chartColor } = useChartPalette()

const totalWantedCards = computed(() => statusBreakdown.value
  .reduce((sum, point) => sum + point.count, 0))

// A distinct qualitative palette, not the searching/found/abandoned
// success-warning-neutral semantic colors badges use elsewhere — those read
// fine as a single status pill, but stacked together as a legend/chart they
// read as "warning vs fine vs nothing", not "three flavors of the same
// thing", which is what this breakdown actually shows.
const colors = WANTED_CARD_STATUSES.map((_, i) => chartColor(i))
const legendItems = WANTED_CARD_STATUSES.map((status, i) => ({
  name: t(`wantedCard.status.${status}`),
  color: chartColor(i)
}))

const x = (_: WantedCardsStatusOverTimePoint, i: number) => i
// One accessor per status — VisStackedBar stacks them in this same order.
const y = WANTED_CARD_STATUSES.map(status =>
  (d: WantedCardsStatusOverTimePoint) => d.counts[status])

// Half a bar-slot of breathing room on each side — same reasoning as the
// other per-period charts on this page.
const xDomain = computed<[number, number]>(() => [-0.5, statusOverTimeSeries.value.length - 0.5])

const xTicks = (i: number) => {
  const point = statusOverTimeSeries.value[i]
  return point ? format(point.month, 'MMM yyy') : ''
}

// VisAxis's default "nice number for the width" heuristic left this axis
// too sparse — an explicit step keeps it readable regardless of how many
// months of data there are: one tick per month up to a year, then every
// 2nd/3rd month as the range grows, same reasoning as
// AgeDistributionChart.client.vue's own xTickValues.
const xTickValues = computed(() => {
  const step = statusOverTimeSeries.value.length <= 12
    ? 1
    : statusOverTimeSeries.value.length <= 24 ? 2 : 3
  return statusOverTimeSeries.value
    .map((_, i) => i)
    .filter(i => i % step === 0)
})

function statusCount(status: WantedCardStatus, counts: Record<WantedCardStatus, number>) {
  return counts[status]
}

const template = (d: WantedCardsStatusOverTimePoint) => [
  `<strong>${format(d.month, 'MMM yyy')}</strong>`,
  ...WANTED_CARD_STATUSES
    .filter(status => statusCount(status, d.counts))
    .map(status => `${t(`wantedCard.status.${status}`)}: ${statusCount(status, d.counts)}`)
].join('<br>')
</script>

<template>
  <StatisticsStatChartCard
    :title="t('statistic.charts.wantedCardsStatus')"
    :value="totalWantedCards"
    :caption="t('statistic.stats.totalWantedCards')"
    :legend-items="legendItems"
    :loading="isLoading"
  >
    <template #default="{ width }">
      <VisXYContainer
        v-if="statusOverTimeSeries.length"
        :data="statusOverTimeSeries"
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
