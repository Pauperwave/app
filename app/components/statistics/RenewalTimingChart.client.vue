<!-- app\components\statistics\RenewalTimingChart.client.vue -->
<script setup lang="ts">
import { format } from 'date-fns'
import { it } from 'date-fns/locale'
import { VisXYContainer, VisGroupedBar, VisAxis, VisCrosshair, VisTooltip } from '@unovis/vue'
import type { RenewalMonthPoint } from '~/composables/statistics/useAssociatesStatistics'

const { selectedYear } = defineProps<{ selectedYear: number }>()

const { t } = useI18n()

const { renewalTimingSeries, isLoading } = useAssociatesStatistics(toRef(() => selectedYear))

const totalRenewals = computed(() => renewalTimingSeries.value
  .reduce((sum, point) => sum + point.count, 0))

// Arbitrary leap year, only the month matters here — renewalTimingSeries
// buckets by month-of-year across every year, not by a specific date.
const monthLabel = (month: number, formatStr: string) =>
  format(new Date(2000, month, 1), formatStr, { locale: it })

const x = (_: RenewalMonthPoint, i: number) => i
const y = (d: RenewalMonthPoint) => d.count

const xDomain = computed<[number, number]>(() => [-0.5, renewalTimingSeries.value.length - 0.5])

const xTicks = (i: number) => renewalTimingSeries.value[i] ? monthLabel(renewalTimingSeries.value[i]!.month, 'MMM') : ''

// One explicit tick per month — VisAxis's default "nice number for the
// width" heuristic was skipping bars, same fix as the other bar charts on
// this page (TournamentsPerYearChart.client.vue etc).
const xTickValues = computed(() => renewalTimingSeries.value.map((_, i) => i))

const template = (d: RenewalMonthPoint) => `${monthLabel(d.month, 'MMMM')}: ${d.count}`
</script>

<template>
  <StatisticsStatChartCard
    :title="t('statistic.charts.renewalTiming')"
    :value="totalRenewals"
    :caption="t('statistic.stats.totalRenewals')"
    :loading="isLoading"
  >
    <template #default="{ width }">
      <VisXYContainer
        v-if="renewalTimingSeries.length"
        :data="renewalTimingSeries"
        :padding="{ top: 40 }"
        :x-domain="xDomain"
        class="h-96"
        :width="width"
      >
        <VisGroupedBar
          :x="x"
          :y="y"
          color="var(--ui-primary)"
        />

        <VisAxis
          type="x"
          :x="x"
          :tick-format="xTicks"
          :tick-values="xTickValues"
        />

        <!-- fallow-ignore-next-line code-duplication -- see AgeDistributionChart.client.vue -->
        <VisCrosshair color="var(--ui-primary)" :template="template" />

        <VisTooltip />
      </VisXYContainer>
    </template>
  </StatisticsStatChartCard>
</template>
