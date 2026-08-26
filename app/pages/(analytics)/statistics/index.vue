<!-- app\pages\(analytics)\statistics\index.vue -->
<script lang="ts" setup>
const { t } = useI18n()

useSeoMeta({ title: () => t('statistic.breadcrumb') })

const tour = useStatisticsTour()

// Drives only the point-in-time cards/chart (new signups, not-renewed,
// tournaments hosted, renewal timing) — the multi-year charts (Crescita
// dell'associazione, Tornei per anno) stay full historical series, unaffected
// by this (user decision, 2026-08-26). Range is the club's actual lifespan,
// not "years with data", since every one of those years genuinely existed.
const availableYears = computed(() => {
  const years: number[] = []
  const currentYear = new Date().getFullYear()
  for (let year = PAUPERWAVE_FOUNDING_YEAR; year <= currentYear; year++) years.push(year)
  return years.reverse()
})
const selectedYear = ref(new Date().getFullYear())
const yearItems = computed(() =>
  availableYears.value.map(year => ({ label: String(year), value: year })))

// The page has no query of its own — every chart pulls from one of these
// three underlying queries (useAssociatesStatistics.ts/useTournamentsStatistics.ts/
// useWantedCardsStatistics.ts), deduped by Pinia Colada's own cache key. Called again
// here just to read/drive their status, not to trigger a second fetch.
const {
  isLoading: associatesLoading, status: associatesStatus, refetch: refetchAssociates
} = useAssociatesQuery()
const {
  isLoading: renewalsLoading, status: renewalsStatus, refetch: refetchRenewals
} = useAssociateRenewalsQuery()
const {
  isLoading: tournamentsLoading, status: tournamentsStatus, refetch: refetchTournaments
} = useTournamentsQuery()
const {
  isLoading: wantedCardsLoading, status: wantedCardsStatus, refetch: refetchWantedCards
} = useWantedCardsQuery()

const loading = computed(() => associatesLoading.value || renewalsLoading.value
  || tournamentsLoading.value || wantedCardsLoading.value)

const statuses = computed(() => [
  associatesStatus.value, renewalsStatus.value, tournamentsStatus.value, wantedCardsStatus.value
])
const status = computed(() => {
  if (statuses.value.includes('error')) return 'error'
  if (statuses.value.includes('pending')) return 'pending'
  return 'success'
})

function refresh() {
  refetchAssociates()
  refetchRenewals()
  refetchTournaments()
  refetchWantedCards()
}
</script>

<template>
  <UDashboardPanel id="statistics">
    <template #header>
      <UDashboardNavbar :title="$t('statistic.breadcrumb')">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #trailing>
          <USeparator orientation="vertical" class="h-4" />

          <QueryRefreshControl :is-loading="loading" :status="status" @refresh="refresh" />
        </template>

        <template #right>
          <UButton
            :label="$t('statistic.tour.startButton')"
            icon="i-lucide-circle-help"
            color="neutral"
            variant="ghost"
            @click="tour.start()"
          />

          <USeparator orientation="vertical" class="h-4" />

          <div id="tour-statistics-year">
            <USelectMenu
              v-model="selectedYear"
              :items="yearItems"
              value-key="value"
              :icon="ICONS.calendar"
              size="lg"
              class="w-30"
            />
          </div>

          <USeparator orientation="vertical" class="h-4" />

          <NotificationsBellButton />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div id="tour-statistics-stats">
        <StatisticsAssociatesStatsCards :selected-year="selectedYear" />
      </div>

      <!-- The flagship "story" chart (monthly resolution across the whole
      2020-2026 span) gets its own full-width row instead of sharing a
      column — its year labels/dashed lines need the extra room more than
      any other chart on this page. -->
      <div id="tour-statistics-growth">
        <ClientOnly>
          <StatisticsAssociatesGrowthChart class="mt-4" />
          <template #fallback>
            <StatisticsStatChartCardSkeleton class="mt-4" />
          </template>
        </ClientOnly>
      </div>

      <!-- Grouped by domain (associates, then tournaments, then wanted
      cards) rather than interleaved — the eye moves through one topic at a
      time instead of bouncing between them. Each chart gets its own id so
      the tour can step through them one at a time. -->
      <div class="grid gap-4 lg:grid-cols-2 mt-4">
        <div id="tour-statistics-age-distribution">
          <ClientOnly>
            <StatisticsAgeDistributionChart :selected-year="selectedYear" />
            <template #fallback>
              <StatisticsStatChartCardSkeleton />
            </template>
          </ClientOnly>
        </div>
        <div id="tour-statistics-renewal-timing">
          <ClientOnly>
            <StatisticsRenewalTimingChart :selected-year="selectedYear" />
            <template #fallback>
              <StatisticsStatChartCardSkeleton />
            </template>
          </ClientOnly>
        </div>
        <div id="tour-statistics-tournaments-per-year">
          <ClientOnly>
            <StatisticsTournamentsPerYearChart />
            <template #fallback>
              <StatisticsStatChartCardSkeleton />
            </template>
          </ClientOnly>
        </div>
        <div id="tour-statistics-wanted-cards-status">
          <ClientOnly>
            <StatisticsWantedCardsStatusChart />
            <template #fallback>
              <StatisticsStatChartCardSkeleton />
            </template>
          </ClientOnly>
        </div>
      </div>
    </template>
  </UDashboardPanel>

  <TourGuide :tour="tour" />
</template>
