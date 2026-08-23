<!-- app\pages\finance\index.vue -->
<script lang="ts" setup>
const { t } = useI18n()

useSeoMeta({ title: () => t('nav.finance') })

const {
  data: transactionsData,
  isLoading: loading,
  status,
  refetch
} = useTransactionsQuery()
const transactions = computed(() => transactionsData.value ?? [])

// Every year with at least one transaction, plus the real current year even
// if it's still empty — sorted newest first (user request, 2026-08-24: "a
// way to switch the data from 2020/2021/2022...").
const availableYears = computed(() => {
  const years = new Set(transactions.value.map(
    transaction => new Date(transaction.payment_date).getFullYear()
  ))
  years.add(new Date().getFullYear())
  return [...years].sort((a, b) => b - a)
})
const selectedYear = ref(new Date().getFullYear())
const yearItems = computed(() =>
  availableYears.value.map(year => ({ label: String(year), value: year })))

// Everything downstream (cards, byMonth/byType/.../byMethodCost, the
// tournament trend chart) only ever sees this one year's transactions —
// filtered here once rather than in every chart/table.
const yearTransactions = computed(() => transactions.value.filter(
  transaction => new Date(transaction.payment_date).getFullYear() === selectedYear.value
))

const {
  byType,
  byMonth,
  byTournament,
  byEvent,
  byFormat,
  byMethodCost,
  grandTotal,
  grandCount,
  totalFees,
  grandNet,
  grandAverage
} = useFinanceSummary(yearTransactions, selectedYear)

const amountFormatter = new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' })

const tour = useFinanceTour()
</script>

<template>
  <UDashboardPanel id="finance">
    <template #header>
      <ListPageNavbar
        :title="$t('nav.finance')"
        :tour-label="$t('finance.tour.startButton')"
        :loading="loading"
        :status="status"
        @refresh="refetch"
        @tour-start="tour.start()"
      >
        <div id="tour-finance-year">
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
      </ListPageNavbar>
    </template>

    <template #body>
      <div class="flex flex-col gap-6">
        <UPageGrid class="sm:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-6 lg:gap-px">
          <StatCard
            id="tour-finance-card-total"
            :icon="ICONS.euro"
            :title="$t('finance.summary.grandTotal')"
            :value="amountFormatter.format(grandTotal)"
          />
          <StatCard
            id="tour-finance-card-fees"
            :icon="ICONS.creditCard"
            :title="$t('finance.summary.totalFees')"
            :value="amountFormatter.format(totalFees)"
          />
          <StatCard
            id="tour-finance-card-net"
            :icon="ICONS.badgeEuro"
            :title="$t('finance.summary.grandNet')"
            :value="amountFormatter.format(grandNet)"
          />
          <StatCard
            id="tour-finance-card-count"
            :icon="ICONS.receipt"
            :title="$t('finance.summary.grandCount')"
            :value="grandCount"
          />
          <StatCard
            id="tour-finance-card-average"
            :icon="ICONS.chartPie"
            :title="$t('finance.summary.grandAverage')"
            :value="amountFormatter.format(grandAverage)"
          />
        </UPageGrid>

        <FinanceMonthlyOverview
          id="tour-finance-table-month"
          :rows="byMonth"
          :loading="loading"
        />

        <div class="flex flex-col gap-6">
          <FinanceTypeOverview
            id="tour-finance-table-type"
            :rows="byType"
            :loading="loading"
          />
          <FinanceFormatOverview
            id="tour-finance-table-format"
            :rows="byFormat"
            :loading="loading"
          />
          <div id="tour-finance-table-tournament" class="flex flex-col gap-6">
            <FinanceTournamentTrendChart :rows="byTournament" :year="selectedYear" />
            <FinanceTournamentSummaryTable :rows="byTournament" :loading="loading" />
          </div>
          <FinanceEventSummaryTable
            id="tour-finance-table-event"
            :rows="byEvent"
            :loading="loading"
          />
        </div>

        <div id="tour-finance-costs">
          <FinanceMethodCostTable :rows="byMethodCost" :loading="loading" />
        </div>
      </div>
    </template>
  </UDashboardPanel>

  <TourGuide :tour="tour" />
</template>
