<!-- app\components\finance\TypeSummaryTable.vue -->
<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { FinanceTypeSummaryRow } from '~/composables/finance/useFinanceSummary'
import PaymentTypeBadge from '~/components/ui/PaymentTypeBadge.vue'

// fallow-ignore-next-line code-duplication -- see the same comment in
// FormatSummaryTable.vue
const { rows, loading, pending = false } = defineProps<{
  rows: FinanceTypeSummaryRow[]
  loading: boolean
  pending?: boolean
}>()

const { t } = useI18n()

const amountFormatter = AMOUNT_FORMATTER
const percentFormatter = new Intl.NumberFormat('it-IT', { style: 'percent', minimumFractionDigits: 1 })

const sorting = ref([{ id: 'total', desc: true }])

// Grand total per numeric column, own `footer` on the leftmost column instead
// of a bare blank cell.
const totalCount = computed(() => columnTotal(rows, 'count'))
const totalAmount = computed(() => columnTotal(rows, 'total'))

const columns: TableColumn<FinanceTypeSummaryRow>[] = [
  {
    accessorKey: 'type',
    header: ({ column }) => sortableHeader(t('finance.summary.type'), column),
    footer: () => t('finance.summary.total'),
    cell: ({ row }) => h(PaymentTypeBadge, { type: row.original.type })
  },
  summaryCountColumn('count', t('finance.summary.count'), totalCount),
  summaryAmountColumn('total', t('finance.summary.total'), amountFormatter, totalAmount),
  summaryAverageColumn('average', t('finance.summary.average'), amountFormatter),
  summaryShareColumn('share', t('finance.summary.share'), percentFormatter)
]
</script>

<template>
  <FinanceSummaryCard
    :title="$t('finance.summary.byTypeTitle')"
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
