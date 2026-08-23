<!-- app\components\finance\MonthSummaryTable.vue -->
<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import { PAYMENT_TYPES } from '#shared/types/transactions'
import type { PaymentType } from '#shared/types/transactions'
import type { FinanceMonthSummaryRow } from '~/composables/finance/useFinanceSummary'

const { rows, loading } = defineProps<{
  rows: FinanceMonthSummaryRow[]
  loading: boolean
}>()

const { t } = useI18n()

const amountFormatter = new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' })

const sorting = ref([{ id: 'label', desc: false }])

// Grand total per payment-type column plus the overall grand total, own
// `footer` on the leftmost column instead of a bare blank cell.
const totalByType = computed(() => Object.fromEntries(
  PAYMENT_TYPES.map(type => [type, rows.reduce((sum, row) => sum + row.totals[type], 0)])
) as Record<PaymentType, number>)
const grandTotal = computed(() => rows.reduce((sum, row) => sum + row.grandTotal, 0))

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
    cell: ({ row }) => amountFormatter.format(row.original.totals[type]),
    footer: () => h('span', { class: 'font-mono font-semibold' }, amountFormatter.format(totalByType.value[type]))
  })),
  {
    accessorKey: 'grandTotal',
    header: ({ column }) => sortableHeader(t('finance.summary.total'), column),
    meta: { class: { th: 'text-right whitespace-nowrap font-semibold', td: 'text-right font-mono font-semibold' } },
    cell: ({ row }) => amountFormatter.format(row.original.grandTotal),
    footer: () => h('span', { class: 'font-mono font-semibold' }, amountFormatter.format(grandTotal.value))
  }
]
</script>

<template>
  <UCard :ui="{ header: 'font-semibold' }">
    <template #header>
      {{ $t('finance.summary.byMonthTitle') }}
    </template>
    <UTable
      v-model:sorting="sorting"
      :data="rows"
      :columns="columns"
      :loading="loading"
    />
  </UCard>
</template>
