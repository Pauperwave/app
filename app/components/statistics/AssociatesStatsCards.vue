<!-- app\components\statistics\AssociatesStatsCards.vue -->
<script setup lang="ts">
import type { Stat } from '~/types'

const { t } = useI18n()
const {
  totalAssociates, newSignupsThisYear, notRenewedFromLastYear, medianAge
} = useAssociatesStatistics()
const { tournamentsThisYear } = useTournamentsStatistics()

// Spelled out per color (rather than built from a template string) so
// Tailwind's static class scan can find them — an interpolated
// `bg-${color}/10` wouldn't survive the production build. Two separate
// slots: `leading` is the circle's background/ring, `leadingIcon` is the
// glyph itself (UPageCard renders it as its own data-slot, not tinted by
// the wrapper's classes — see node_modules/@nuxt/ui's PageCard.vue).
const LEADING_COLOR_CLASSES: Record<NonNullable<Stat['color']>, string> = {
  primary: 'bg-primary/10 ring-primary/25',
  success: 'bg-success/10 ring-success/25',
  error: 'bg-error/10 ring-error/25'
}
const LEADING_ICON_COLOR_CLASSES: Record<NonNullable<Stat['color']>, string> = {
  primary: 'text-primary',
  success: 'text-success',
  error: 'text-error'
}

function leadingClasses(color: Stat['color']) {
  return `p-2.5 rounded-full ring ring-inset flex-col ${LEADING_COLOR_CLASSES[color ?? 'primary']}`
}

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
    <UPageCard
      v-for="(stat, index) in stats"
      :key="index"
      :icon="stat.icon"
      :title="stat.title"
      variant="subtle"
      :ui="{
        container: 'gap-y-1.5',
        wrapper: 'items-start',
        leading: leadingClasses(stat.color),
        leadingIcon: LEADING_ICON_COLOR_CLASSES[stat.color ?? 'primary'],
        title: 'font-normal text-muted text-xs uppercase'
      }"
      class="lg:rounded-none first:rounded-l-lg last:rounded-r-lg hover:z-1"
    >
      <span class="text-2xl font-semibold text-highlighted">
        {{ stat.value }}
      </span>
    </UPageCard>
  </UPageGrid>
</template>
