<!-- app\components\finance\TypeOverview.vue -->
<!-- Same Grafico/Tabella merge as MonthlyOverview.vue, byType instead of
byMonth (user request, 2026-08-24). Back to owning its own local switch
(reverted 2026-08-24) — see MonthlyOverview.vue's comment for why the
page-wide shared switch was rejected. -->
<script setup lang="ts">
import type { TabsItem } from '@nuxt/ui'
import type { FinanceTypeSummaryRow } from '~/composables/finance/useFinanceSummary'

const { rows, loading } = defineProps<{
  rows: FinanceTypeSummaryRow[]
  loading: boolean
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

    <FinanceTypeChart v-if="viewMode === 'chart'" :rows="rows" />
    <FinanceTypeSummaryTable v-else :rows="rows" :loading="loading" />
  </div>
</template>
