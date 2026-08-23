<!-- app\components\finance\FormatSummaryTable.vue -->
<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { FinanceFormatSummaryRow } from '~/composables/finance/useFinanceSummary'
import FormatBadge from '~/components/badges/FormatBadge.vue'

const { rows, loading } = defineProps<{
  rows: FinanceFormatSummaryRow[]
  loading: boolean
}>()

const { t } = useI18n()

const amountFormatter = new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' })
const percentFormatter = new Intl.NumberFormat('it-IT', { style: 'percent', minimumFractionDigits: 1 })

const sorting = ref([{ id: 'total', desc: true }])

// Grand total per numeric column, own `footer` on the leftmost column instead
// of a bare blank cell.
const totalTournamentCount = computed(() => rows.reduce((sum, row) => sum + row.tournamentCount, 0))
const totalCount = computed(() => rows.reduce((sum, row) => sum + row.count, 0))
const totalAmount = computed(() => rows.reduce((sum, row) => sum + row.total, 0))

const columns: TableColumn<FinanceFormatSummaryRow>[] = [
  {
    accessorKey: 'format',
    header: ({ column }) => sortableHeader(t('finance.summary.format'), column),
    footer: () => t('finance.summary.total'),
    cell: ({ row }) => h(FormatBadge, { format: row.original.format, icon: ICONS.gameplay })
  },
  {
    accessorKey: 'tournamentCount',
    header: ({ column }) => sortableHeader(t('finance.summary.tournamentCount'), column),
    meta: { class: { th: 'text-right', td: 'text-right font-mono' } },
    footer: () => h('span', { class: 'font-mono font-semibold' }, String(totalTournamentCount.value))
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
      {{ $t('finance.summary.byFormatTitle') }}
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
