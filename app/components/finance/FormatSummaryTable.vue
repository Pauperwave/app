<!-- app\components\finance\FormatSummaryTable.vue -->
<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { FinanceFormatSummaryRow } from '~/composables/finance/useFinanceSummary'
import FormatBadge from '~/components/badges/FormatBadge.vue'

// fallow-ignore-next-line code-duplication -- props/formatter/sorting scaffolding mirrors every *SummaryTable.vue
const { rows, loading, pending = false } = defineProps<{
  rows: FinanceFormatSummaryRow[]
  loading: boolean
  pending?: boolean
}>()

const { t } = useI18n()

const amountFormatter = AMOUNT_FORMATTER
const percentFormatter = new Intl.NumberFormat('it-IT', { style: 'percent', minimumFractionDigits: 1 })

const sorting = ref([{ id: 'total', desc: true }])

// Grand total per numeric column, own `footer` on the leftmost column instead
// of a bare blank cell.
const totalTournamentCount = computed(() => columnTotal(rows, 'tournamentCount'))
const totalCount = computed(() => columnTotal(rows, 'count'))
// fallow-ignore-next-line code-duplication -- see the same comment in CategorySummaryTable.vue
const totalCash = computed(() => columnTotal(rows, 'cashTotal'))
const totalPos = computed(() => columnTotal(rows, 'posTotal'))
const totalAmount = computed(() => columnTotal(rows, 'total'))

const columns: TableColumn<FinanceFormatSummaryRow>[] = [
  {
    accessorKey: 'format',
    header: ({ column }) => sortableHeader(t('finance.summary.format'), column),
    footer: () => t('finance.summary.total'),
    cell: ({ row }) => h(FormatBadge, { format: row.original.format, icon: ICONS.gameplay })
  },
  summaryCountColumn('tournamentCount', t('finance.summary.tournamentCount'), totalTournamentCount),
  summaryCountColumn('count', t('finance.summary.count'), totalCount),
  summaryAmountColumn('cashTotal', t('finance.summary.cashTotal'), amountFormatter, totalCash),
  summaryAmountColumn('posTotal', t('finance.summary.posTotal'), amountFormatter, totalPos),
  summaryAmountColumn('total', t('finance.summary.total'), amountFormatter, totalAmount),
  summaryAverageColumn('average', t('finance.summary.average'), amountFormatter),
  summaryShareColumn('share', t('finance.summary.share'), percentFormatter)
]
</script>

<template>
  <FinanceSummaryCard
    :title="$t('finance.summary.byFormatTitle')"
    :pending="pending"
    :columns-count="columns.length"
  >
    <UTable
      v-model:sorting="sorting"
      :data="rows"
      :columns="columns"
      :loading="loading"
      :ui="{ base: 'overflow-clip' }"
    />
  </FinanceSummaryCard>
</template>
