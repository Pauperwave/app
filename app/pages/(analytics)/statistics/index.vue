<!-- app\pages\(analytics)\statistics\index.vue -->
<script lang="ts" setup>
const { t } = useI18n()

useSeoMeta({ title: () => t('statistic.breadcrumb') })

const tour = useStatisticsTour()
</script>

<template>
  <UDashboardPanel id="statistics">
    <template #header>
      <UDashboardNavbar :title="$t('statistic.breadcrumb')">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <UButton
            :label="$t('statistic.tour.startButton')"
            icon="i-lucide-circle-help"
            color="neutral"
            variant="ghost"
            @click="tour.start()"
          />

          <NotificationsBellButton />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div id="tour-statistics-stats">
        <StatisticsAssociatesStatsCards />
      </div>

      <!-- The flagship "story" chart (monthly resolution across the whole
      2020-2026 span) gets its own full-width row instead of sharing a
      column — its year labels/dashed lines need the extra room more than
      any other chart on this page. -->
      <div id="tour-statistics-growth">
        <StatisticsAssociatesGrowthChart class="mt-4" />
      </div>

      <!-- Grouped by domain (associates, then tournaments, then wanted
      cards) rather than interleaved — the eye moves through one topic at a
      time instead of bouncing between them. Each chart gets its own id so
      the tour can step through them one at a time. -->
      <div class="grid gap-4 lg:grid-cols-2 mt-4">
        <div id="tour-statistics-age-distribution">
          <StatisticsAgeDistributionChart />
        </div>
        <div id="tour-statistics-renewal-timing">
          <StatisticsRenewalTimingChart />
        </div>
        <div id="tour-statistics-tournaments-per-year">
          <StatisticsTournamentsPerYearChart />
        </div>
        <div id="tour-statistics-wanted-cards-status">
          <StatisticsWantedCardsStatusChart />
        </div>
      </div>
    </template>
  </UDashboardPanel>

  <TourGuide :tour="tour" />
</template>
