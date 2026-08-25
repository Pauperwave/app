<!-- app\components\finance\TypeSummaryTable.vue -->
<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { FinanceTypeSummaryRow } from '~/composables/finance/useFinanceSummary'
import PaymentTypeBadge from '~/components/ui/PaymentTypeBadge.vue'

const { rows, loading, pending = false } = defineProps<{
  rows: FinanceTypeSummaryRow[]
  loading: boolean
  pending?: boolean
}>()

const { t } = useI18n()

const amountFormatter = new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' })
const percentFormatter = new Intl.NumberFormat('it-IT', { style: 'percent', minimumFractionDigits: 1 })

const sorting = ref([{ id: 'total', desc: true }])

// Grand total per numeric column, own `footer` on the leftmost column instead
// of a bare blank cell.
const totalCount = computed(() => rows.reduce((sum, row) => sum + row.count, 0))
const totalAmount = computed(() => rows.reduce((sum, row) => sum + row.total, 0))

const columns: TableColumn<FinanceTypeSummaryRow>[] = [
  {
    accessorKey: 'type',
    header: ({ column }) => sortableHeader(t('finance.summary.type'), column),
    footer: () => t('finance.summary.total'),
    cell: ({ row }) => h(PaymentTypeBadge, { type: row.original.type })
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
    accessorKey: 'average',
    header: ({ column }) => sortableHeader(t('finance.summary.average'), column),
    meta: { class: { th: 'text-right', td: 'text-right font-mono' } },
    cell: ({ row }) => amountCell(row.original.average, amountFormatter)
  },
  {
    accessorKey: 'share',
    header: ({ column }) => sortableHeader(t('finance.summary.share'), column),
    meta: { class: { th: 'text-right', td: 'text-right font-mono' } },
    cell: ({ row }) => percentFormatter.format(row.original.share),
    footer: () => h('span', { class: 'font-mono font-semibold' }, percentFormatter.format(1))
  }
]
</script>

<template>
  <UCard :ui="{ header: 'font-semibold' }">
    <template #header>
      {{ $t('finance.summary.byTypeTitle') }}
    </template>
    <ListSkeleton v-if="pending" :columns="columns.length" />
    <UTable
      v-else
      v-model:sorting="sorting"
      :data="rows"
      :columns="columns"
      :loading="loading"
      :ui="{ base: 'overflow-clip' }"
    />
  </UCard>
</template>
