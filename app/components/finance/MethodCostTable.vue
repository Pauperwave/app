<!-- app\components\finance\MethodCostTable.vue -->
<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { FinanceMethodCostRow } from '~/composables/finance/useFinanceSummary'
import PaymentMethodBadge from '~/components/ui/PaymentMethodBadge.vue'

const { rows, loading } = defineProps<{
  rows: FinanceMethodCostRow[]
  loading: boolean
}>()

const { t } = useI18n()

const amountFormatter = new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' })
const percentFormatter = new Intl.NumberFormat('it-IT', { style: 'percent', minimumFractionDigits: 2 })

const sorting = ref([{ id: 'total', desc: true }])

// Grand total per numeric column, own `footer` on the leftmost column instead
// of a bare blank cell. feeRate has no footer at all — a rate isn't a
// summable quantity, and a blended-rate footer was tried and rejected (user
// request, 2026-08-23): not what "totale" means for a rate column.
const totalCount = computed(() => rows.reduce((sum, row) => sum + row.count, 0))
const totalAmount = computed(() => rows.reduce((sum, row) => sum + row.total, 0))
const totalFee = computed(() => rows.reduce((sum, row) => sum + row.fee, 0))
const totalNet = computed(() => rows.reduce((sum, row) => sum + row.net, 0))

// Only POS carries a modeled fee today (see paymentMethodFees.ts) — the
// other methods' feeRate/fee are always 0, still shown for a full apples-to-
// apples comparison rather than filtering them out of the table.
const columns: TableColumn<FinanceMethodCostRow>[] = [
  {
    accessorKey: 'method',
    header: ({ column }) => sortableHeader(t('finance.summary.method'), column),
    footer: () => t('finance.summary.total'),
    cell: ({ row }) => h(PaymentMethodBadge, { method: row.original.method })
  },
  {
    accessorKey: 'count',
    header: ({ column }) => sortableHeader(t('finance.summary.count'), column),
    meta: { class: { th: 'text-right', td: 'text-right font-mono' } },
    footer: () => h('span', { class: 'font-mono font-semibold' }, String(totalCount.value))
  },
  {
    accessorKey: 'total',
    header: ({ column }) => sortableHeader(t('finance.summary.total'), column),
    meta: { class: { th: 'text-right', td: 'text-right font-mono' } },
    cell: ({ row }) => amountCell(row.original.total, amountFormatter),
    footer: () => h('span', { class: 'font-mono font-semibold' }, amountFormatter.format(totalAmount.value))
  },
  {
    accessorKey: 'share',
    header: ({ column }) => sortableHeader(t('finance.summary.share'), column),
    meta: { class: { th: 'text-right', td: 'text-right font-mono' } },
    cell: ({ row }) => percentFormatter.format(row.original.share),
    footer: () => h('span', { class: 'font-mono font-semibold' }, percentFormatter.format(1))
  },
  {
    accessorKey: 'feeRate',
    header: ({ column }) => sortableHeader(t('finance.summary.feeRate'), column),
    meta: { class: { th: 'text-right', td: 'text-right font-mono' } },
    cell: ({ row }) => row.original.feeRate ? percentFormatter.format(row.original.feeRate) : '—'
  },
  {
    accessorKey: 'fee',
    header: ({ column }) => sortableHeader(t('finance.summary.fee'), column),
    meta: { class: { th: 'text-right', td: 'text-right font-mono' } },
    // 0,00 € (every method but POS, see the comment above) is not a cost
    // to flag red — only a real fee gets the error color.
    cell: ({ row }) => row.original.fee
      ? h('span', { class: 'text-error' }, `-${amountFormatter.format(row.original.fee)}`)
      : h('span', { class: 'text-muted' }, amountFormatter.format(0)),
    footer: () => h('span', { class: 'font-mono font-semibold text-error' }, `-${amountFormatter.format(totalFee.value)}`)
  },
  {
    accessorKey: 'net',
    header: ({ column }) => sortableHeader(t('finance.summary.net'), column),
    meta: { class: { th: 'text-right', td: 'text-right font-mono font-semibold' } },
    cell: ({ row }) => amountCell(row.original.net, amountFormatter),
    footer: () => h('span', { class: 'font-mono font-semibold' }, amountFormatter.format(totalNet.value))
  }
]
</script>

<template>
  <UCard :ui="{ header: 'font-semibold' }">
    <template #header>
      {{ $t('finance.summary.costsTitle') }}
    </template>
    <UTable
      v-model:sorting="sorting"
      :data="rows"
      :columns="columns"
      :loading="loading"
      :ui="{ base: 'overflow-clip' }"
    />
  </UCard>
</template>
