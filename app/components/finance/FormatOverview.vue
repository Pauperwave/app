<!-- app\components\finance\FormatOverview.vue -->
<!-- The Grafico/Tabella merge of MonthlyOverview.vue, byFormat instead of byMonth. It owns its
     own local switch (see MonthlyOverview.vue for why a page-wide shared switch was rejected) -->
<script setup lang="ts">
import type { TabsItem } from '@nuxt/ui'
import type { FinanceFormatSummaryRow } from '~/composables/finance/useFinanceSummary'

const { rows, loading, pending = false } = defineProps<{
  rows: FinanceFormatSummaryRow[]
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
      <FinanceFormatChart :rows="rows" :loading="loading" />
      <template #fallback>
        <StatisticsStatChartCardSkeleton />
      </template>
    </ClientOnly>
    <FinanceFormatSummaryTable
      v-else
      :rows="rows"
      :loading="loading"
      :pending="pending"
    />
  </div>
</template>
