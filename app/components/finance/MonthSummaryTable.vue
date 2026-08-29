<!-- app\components\finance\MonthSummaryTable.vue -->
<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import { PAYMENT_TYPES } from '#shared/types/transactions'
import type { PaymentType } from '#shared/types/transactions'
import type { FinanceMonthSummaryRow } from '~/composables/finance/useFinanceSummary'

const { rows, loading, pending = false } = defineProps<{
  rows: FinanceMonthSummaryRow[]
  loading: boolean
  pending?: boolean
}>()

const { t } = useI18n()

const amountFormatter = AMOUNT_FORMATTER

const sorting = ref([{ id: 'label', desc: false }])

// Grand total per payment-type column plus the overall grand total, own
// `footer` on the leftmost column instead of a bare blank cell.
const totalByType = computed(() => Object.fromEntries(
  PAYMENT_TYPES.map(type => [type, rows.reduce((sum, row) => sum + row.totals[type], 0)])
) as Record<PaymentType, number>)
const grandTotal = computed(() => columnTotal(rows, 'grandTotal'))

// Running total through each month, keyed by month regardless of the
// table's current sort — chronological order always drives the running sum
// even if the visible rows are sorted by a different column (user request,
// 2026-08-24).
const cumulativeByMonth = computed(() => {
  const chronological = [...rows].sort((a, b) => a.month.localeCompare(b.month))
  const byMonth = new Map<string, number>()
  let running = 0
  for (const row of chronological) {
    running += row.grandTotal
    byMonth.set(row.month, running)
  }
  return byMonth
})

// One column per payment type plus month/grand-total — same
// PAYMENT_TYPE_LABEL_KEYS i18n keys the transactions table's own tabs/badges
// use, so a category reads the same everywhere.
const columns: TableColumn<FinanceMonthSummaryRow>[] = [
  {
    // accessorFn on 'month' ("yyyy-MM"), not 'label' — sorting on the
    // localized label ("gennaio 2026") sorted alphabetically by month name
    // instead of chronologically (user request, 2026-08-23).
    id: 'label',
    accessorFn: row => row.month,
    header: ({ column }) => sortableHeader(t('finance.summary.month'), column),
    meta: { class: { td: 'whitespace-nowrap capitalize' } },
    cell: ({ row }) => row.original.label,
    footer: () => t('finance.summary.total')
  },
  ...PAYMENT_TYPES.map((type): TableColumn<FinanceMonthSummaryRow> => ({
    id: type,
    accessorFn: row => row.totals[type],
    header: ({ column }) => sortableHeader(t(PAYMENT_TYPE_LABEL_KEYS[type]), column),
    meta: { class: { th: 'text-right whitespace-nowrap', td: 'text-right font-mono' } },
    cell: ({ row }) => amountCell(row.original.totals[type], amountFormatter),
    footer: () => h('span', { class: 'font-mono font-semibold' }, amountFormatter.format(totalByType.value[type]))
  })),
  {
    accessorKey: 'grandTotal',
    header: ({ column }) => sortableHeader(t('finance.summary.total'), column),
    meta: { class: { th: 'text-right whitespace-nowrap font-semibold', td: 'text-right font-mono font-semibold' } },
    cell: ({ row }) => amountCell(row.original.grandTotal, amountFormatter),
    footer: () => h('span', { class: 'font-mono font-semibold' }, amountFormatter.format(grandTotal.value))
  },
  {
    id: 'cumulative',
    accessorFn: row => cumulativeByMonth.value.get(row.month) ?? 0,
    header: ({ column }) => sortableHeader(t('finance.summary.cumulative'), column),
    meta: { class: { th: 'text-right whitespace-nowrap', td: 'text-right font-mono' } },
    cell: ({ row }) =>
      amountCell(cumulativeByMonth.value.get(row.original.month) ?? 0, amountFormatter),
    footer: () => h('span', { class: 'font-mono font-semibold' }, amountFormatter.format(grandTotal.value))
  }
]
</script>

<template>
  <FinanceSummaryCard
    :title="$t('finance.summary.byMonthTitle')"
    :pending="pending"
    :columns-count="columns.length"
  >
    <UTable
      v-model:sorting="sorting"
      :data="rows"
      :columns="columns"
      :loading="loading"
    />
  </FinanceSummaryCard>
</template>
