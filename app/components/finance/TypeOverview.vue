<!-- app\components\finance\TypeOverview.vue -->
<!-- Same Grafico/Tabella merge as MonthlyOverview.vue, byType instead of
byMonth (user request, 2026-08-24). Back to owning its own local switch
(reverted 2026-08-24) — see MonthlyOverview.vue's comment for why the
page-wide shared switch was rejected. -->
<script setup lang="ts">
import type { TabsItem } from '@nuxt/ui'
import type { FinanceTypeSummaryRow } from '~/composables/finance/useFinanceSummary'

const { rows, loading, pending = false } = defineProps<{
  rows: FinanceTypeSummaryRow[]
  loading: boolean
  pending?: boolean
}>()

const { t } = useI18n()

const viewMode = ref<'chart' | 'table'>('chart')
const viewModeItems = computed<TabsItem[]>(() => [
  { label: t('finance.views.chart'), value: 'chart', icon: ICONS.chartArea },
  { label: t('finance.views.table'), value: 'table', icon: ICONS.table }
])
</script>

<template>
  <div class="flex flex-col gap-2">
    <div class="flex justify-end">
      <ViewModeTabs v-model="viewMode" :items="viewModeItems" />
    </div>

    <ClientOnly v-if="viewMode === 'chart'">
      <FinanceTypeChart :rows="rows" :loading="loading" />
      <template #fallback>
        <StatisticsStatChartCardSkeleton />
      </template>
    </ClientOnly>
    <FinanceTypeSummaryTable
      v-else
      :rows="rows"
      :loading="loading"
      :pending="pending"
    />
  </div>
</template>
