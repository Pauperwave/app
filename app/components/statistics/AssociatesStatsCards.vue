<!-- app\components\statistics\AssociatesStatsCards.vue -->
<script setup lang="ts">
import type { Stat } from '~/types'

const { selectedYear } = defineProps<{ selectedYear: number }>()

const { t } = useI18n()
const yearRef = toRef(() => selectedYear)
const {
  totalAssociates, newSignupsThisYear, notRenewedFromLastYear, medianAge
} = useAssociatesStatistics(yearRef)
const { tournamentsThisYear } = useTournamentsStatistics(yearRef)

const stats = computed<Stat[]>(() => [{
  title: t('statistic.stats.totalAssociates'),
  icon: ICONS.players,
  value: totalAssociates.value,
  variation: 0
}, {
  title: t('statistic.stats.newSignupsThisYear'),
  icon: ICONS.addPlayer,
  value: newSignupsThisYear.value,
  variation: 0,
  color: 'success'
}, {
  title: t('statistic.stats.notRenewedFromLastYear'),
  icon: ICONS.playerLapsed,
  value: notRenewedFromLastYear.value,
  variation: 0,
  color: 'error'
}, {
  title: t('statistic.stats.medianAge'),
  icon: ICONS.cake,
  value: medianAge.value ?? '—',
  variation: 0
}, {
  title: t('statistic.stats.tournamentsThisYear'),
  icon: ICONS.standings,
  value: tournamentsThisYear.value,
  variation: 0
}])
</script>

<template>
  <UPageGrid class="lg:grid-cols-5 gap-4 sm:gap-6 lg:gap-px">
    <StatCard
      v-for="(stat, index) in stats"
      :key="index"
      :icon="stat.icon"
      :title="stat.title"
      :value="stat.value"
      :color="stat.color"
    />
  </UPageGrid>
</template>
