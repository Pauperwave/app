<!-- app\components\statistics\CommanderWinRateChart.client.vue -->
<!-- Win-rate donut for one commander's detail page, like league's TournamentAwards win-rate pie
     (league's commander pages, adapted), built with this app's chart library (@unovis/vue,
     StatChartCard) instead of league's echarts: every other /statistics chart uses unovis, and
     echarts is registered in nuxt.config.ts but unused here. -->
<script setup lang="ts">
import { VisSingleContainer, VisDonut } from '@unovis/vue'

const { wins, matches } = defineProps<{
  wins: number
  matches: number
}>()

const { t } = useI18n()
const { chartColor } = useChartPalette()

const others = computed(() => Math.max(matches - wins, 0))
const winRatePercent = computed(() => matches > 0 ? Math.round((wins / matches) * 100) : 0)

interface Slice { name: string, value: number, color: string }

const data = computed<Slice[]>(() => [
  { name: t('commander.page.chartWins'), value: wins, color: chartColor(0) },
  { name: t('commander.page.chartOtherMatches'), value: others.value, color: chartColor(1) }
])

const legendItems = computed(() => data.value.map(d => ({ name: d.name, color: d.color })))

const value = (d: Slice) => d.value
const color = (d: Slice) => d.color
</script>

<template>
  <StatisticsStatChartCard
    :title="t('commander.page.winRateHeading')"
    :value="`${winRatePercent}%`"
    :caption="t('commander.page.chartWins')"
    :legend-items="legendItems"
  >
    <template #default="{ width }">
      <VisSingleContainer
        :data="data"
        :width="width"
        class="h-80"
      >
        <VisDonut
          :value="value"
          :color="color"
          :arc-width="24"
          :central-label="`${winRatePercent}%`"
          :central-sub-label="t('commander.page.chartWins')"
        />
      </VisSingleContainer>
    </template>
  </StatisticsStatChartCard>
</template>
