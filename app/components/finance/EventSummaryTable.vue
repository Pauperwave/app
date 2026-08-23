<!-- app\components\finance\EventSummaryTable.vue -->
<script setup lang="ts">
import { UButton } from '#components'
import type { TableColumn } from '@nuxt/ui'
import type { FinanceEventSummaryRow } from '~/composables/finance/useFinanceSummary'
import DateWithRelativeTooltip from '~/components/ui/DateWithRelativeTooltip.vue'

const { rows, loading } = defineProps<{
  rows: FinanceEventSummaryRow[]
  loading: boolean
}>()

const { t } = useI18n()

const amountFormatter = new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' })

const sorting = ref([{ id: 'total', desc: true }])

// Grand total per numeric column, own `footer` on the leftmost column instead
// of a bare blank cell.
const totalCount = computed(() => rows.reduce((sum, row) => sum + row.count, 0))
const totalAmount = computed(() => rows.reduce((sum, row) => sum + row.total, 0))

// Same shape as TournamentSummaryTable.vue, minus format/stage — an event
// has neither (Event, app/types/index.d.ts).
const columns: TableColumn<FinanceEventSummaryRow>[] = [
  {
    accessorKey: 'name',
    header: ({ column }) => sortableHeader(t('finance.summary.event'), column),
    footer: () => t('finance.summary.total'),
    cell: ({ row }) => h(UButton, {
      to: `/events/${row.original.uuid}`,
      icon: PAYMENT_TYPE_BADGE_CONFIG['Event Fee'].icon,
      size: 'xs',
      color: 'neutral',
      variant: 'subtle'
    }, () => row.original.name)
  },
  {
    accessorKey: 'startDate',
    header: ({ column }) => sortableHeader(t('finance.summary.date'), column),
    meta: { class: { th: 'whitespace-nowrap', td: 'whitespace-nowrap' } },
    cell: ({ row }) => h(DateWithRelativeTooltip, { isoString: row.original.startDate })
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
  }
]
</script>

<template>
  <UCard :ui="{ header: 'font-semibold' }">
    <template #header>
      {{ $t('finance.summary.byEventTitle') }}
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
