<!-- app\components\finance\CategorySummaryTable.vue -->
<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { FinanceCategoryRow } from '~/composables/finance/useFinanceSummary'
import FormatBadge from '~/components/badges/FormatBadge.vue'
import PaymentTypeBadge from '~/components/ui/PaymentTypeBadge.vue'

const { rows, loading } = defineProps<{
  rows: FinanceCategoryRow[]
  loading: boolean
}>()

const { t } = useI18n()

const amountFormatter = new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' })

// Fixed row order (associationFee, byFormat's own rows, eventFee,
// tokenPurchase, donation — see useFinanceSummary.ts's byCategory) — no
// user-facing sort here, unlike the page's other summary tables.

// Grand total per numeric column, own `footer` on the leftmost column instead
// of a bare blank cell. No footer for `cost` — a unit price isn't a summable
// quantity, same reasoning as MethodCostTable.vue's feeRate column.
const totalCount = computed(() => rows.reduce((sum, row) => sum + row.count, 0))
const totalPaypal = computed(() => rows.reduce((sum, row) => sum + row.paypalTotal, 0))
const totalCash = computed(() => rows.reduce((sum, row) => sum + row.cashTotal, 0))
const totalPos = computed(() => rows.reduce((sum, row) => sum + row.posTotal, 0))
const totalAmount = computed(() => rows.reduce((sum, row) => sum + row.total, 0))

const columns: TableColumn<FinanceCategoryRow>[] = [
  {
    id: 'category',
    // No stable per-row identity needed beyond display — 'format' rows share
    // the same `type`, so accessorFn falls back to `format` itself, unique
    // among those.
    accessorFn: row => row.format ?? row.type,
    header: () => t('finance.summary.category'),
    footer: () => t('finance.summary.total'),
    cell: ({ row }) => row.original.type === 'format'
      ? h(FormatBadge, { format: row.original.format!, icon: ICONS.battle })
      : h(PaymentTypeBadge, { type: FINANCE_CATEGORY_PAYMENT_TYPE[row.original.type] })
  },
  {
    accessorKey: 'cost',
    header: () => t('finance.summary.cost'),
    meta: { class: { th: 'text-right', td: 'text-right font-mono' } },
    cell: ({ row }) => row.original.cost === null ? '' : amountCell(row.original.cost, amountFormatter)
  },
  {
    accessorKey: 'count',
    header: () => t('finance.summary.instances'),
    meta: { class: { th: 'text-right', td: 'text-right font-mono' } },
    footer: () => h('span', { class: 'font-mono font-semibold' }, String(totalCount.value))
  },
  {
    accessorKey: 'quantity',
    header: () => t('finance.summary.quantity'),
    meta: { class: { th: 'text-right', td: 'text-right font-mono' } },
    cell: ({ row }) => row.original.quantity === null ? '' : String(row.original.quantity)
  },
  {
    accessorKey: 'paypalTotal',
    header: () => t('finance.summary.paypalTotal'),
    meta: { class: { th: 'text-right', td: 'text-right font-mono' } },
    cell: ({ row }) => amountCell(row.original.paypalTotal, amountFormatter),
    footer: () => h('span', { class: 'font-mono font-semibold' }, amountFormatter.format(totalPaypal.value))
  },
  {
    accessorKey: 'cashTotal',
    header: () => t('finance.summary.cashTotal'),
    meta: { class: { th: 'text-right', td: 'text-right font-mono' } },
    cell: ({ row }) => amountCell(row.original.cashTotal, amountFormatter),
    footer: () => h('span', { class: 'font-mono font-semibold' }, amountFormatter.format(totalCash.value))
  },
  {
    accessorKey: 'posTotal',
    header: () => t('finance.summary.posTotal'),
    meta: { class: { th: 'text-right', td: 'text-right font-mono' } },
    cell: ({ row }) => amountCell(row.original.posTotal, amountFormatter),
    footer: () => h('span', { class: 'font-mono font-semibold' }, amountFormatter.format(totalPos.value))
  },
  {
    accessorKey: 'total',
    header: () => t('finance.summary.total'),
    meta: { class: { th: 'text-right', td: 'text-right font-mono font-semibold' } },
    cell: ({ row }) => amountCell(row.original.total, amountFormatter),
    footer: () => h('span', { class: 'font-mono font-semibold' }, amountFormatter.format(totalAmount.value))
  }
]
</script>

<template>
  <UCard :ui="{ header: 'font-semibold' }">
    <template #header>
      {{ $t('finance.summary.byCategoryTitle') }}
    </template>
    <UTable
      :data="rows"
      :columns="columns"
      :loading="loading"
      :ui="{ base: 'overflow-clip' }"
    />
  </UCard>
</template>
