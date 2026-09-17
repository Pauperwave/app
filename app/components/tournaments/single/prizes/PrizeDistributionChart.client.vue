<!-- app\components\tournaments\single\prizes\PrizeDistributionChart.client.vue -->
<!--
  Placement -> suggested packs histogram, same VisXYContainer/VisGroupedBar
  structure as AgeDistributionChart.client.vue, without the KDE overlay
  (there's no continuous distribution to smooth here, just per-rank bars).
-->
<script setup lang="ts">
import {
  VisXYContainer, VisGroupedBar, VisAxis, VisCrosshair, VisTooltip
} from '@unovis/vue'

interface PrizeChartPoint {
  rank: number
  label: string
  packs: number
}

const { rows } = defineProps<{
  rows: Array<{ label: string, packs: number }>
}>()

const { t } = useI18n()

const chartData = computed<PrizeChartPoint[]>(() =>
  rows.map((row, index) => ({ rank: index + 1, label: row.label, packs: row.packs })))

const x = (_: PrizeChartPoint, i: number) => i
const y = (d: PrizeChartPoint) => d.packs

const xDomain = computed<[number, number]>(() => [-0.5, chartData.value.length - 0.5])
const xTicks = (i: number) => chartData.value[i]?.rank.toString() ?? ''

const template = (d: PrizeChartPoint) =>
  t('tournament.single.prizeDistribution.chartTooltip', { rank: d.rank, label: d.label, packs: d.packs }, d.packs)
</script>

<template>
  <VisXYContainer
    v-if="chartData.length"
    :data="chartData"
    :padding="{ top: 20 }"
    :x-domain="xDomain"
    class="h-64"
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
    />

    <VisCrosshair color="var(--ui-primary)" :template="template" />

    <VisTooltip />
  </VisXYContainer>
</template>
