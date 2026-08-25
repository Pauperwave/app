<!-- app\components\finance\MonthlyOverview.vue -->
<!-- "Andamento mensile" (chart) and "Riepilogo mensile" (table) show the
same byMonth data two different ways — merged behind a grid/table switch
(user request, 2026-08-23). Back to owning its own local switch (reverted
2026-08-24) — a single page-wide switch controlling this + FormatOverview +
TypeOverview together was tried and then rejected by the user: it forced all
three sections into the same mode even when someone wants to read one as a
chart and another as exact numbers in a table. -->
<script setup lang="ts">
import type { TabsItem } from '@nuxt/ui'
import type { FinanceMonthSummaryRow } from '~/composables/finance/useFinanceSummary'

const { rows, loading, pending = false } = defineProps<{
  rows: FinanceMonthSummaryRow[]
  loading: boolean
  pending?: boolean
}>()

const { t } = useI18n()

const viewMode = ref<'chart' | 'table'>('chart')
const viewModeItems = computed<TabsItem[]>(() => [
  { label: t('finance.views.chart'), value: 'chart', icon: 'i-lucide-chart-area' },
  { label: t('finance.views.table'), value: 'table', icon: 'i-lucide-table' }
])
</script>

<template>
  <div class="flex flex-col gap-2">
    <div class="flex justify-end">
      <ViewModeTabs v-model="viewMode" :items="viewModeItems" />
    </div>

    <ClientOnly v-if="viewMode === 'chart'">
      <FinanceMonthlyTrendChart :rows="rows" :loading="loading" />
      <template #fallback>
        <StatisticsStatChartCardSkeleton />
      </template>
    </ClientOnly>
    <FinanceMonthSummaryTable
      v-else
      :rows="rows"
      :loading="loading"
      :pending="pending"
    />
  </div>
</template>
