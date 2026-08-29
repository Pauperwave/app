<!-- app\components\finance\EventSummaryTable.vue -->
<script setup lang="ts">
import { UButton } from '#components'
import type { TableColumn } from '@nuxt/ui'
import type { FinanceEventSummaryRow } from '~/composables/finance/useFinanceSummary'
import DateWithRelativeTooltip from '~/components/ui/DateWithRelativeTooltip.vue'

const { rows, loading, pending = false } = defineProps<{
  rows: FinanceEventSummaryRow[]
  loading: boolean
  pending?: boolean
}>()

const { t } = useI18n()

const amountFormatter = AMOUNT_FORMATTER

const sorting = ref([{ id: 'combinedTotal', desc: true }])

// Grand total per numeric column, own `footer` on the leftmost column instead
// of a bare blank cell.
const totalCount = computed(() => columnTotal(rows, 'count'))
const totalGettoniCount = computed(() => columnTotal(rows, 'gettoniCount'))
const totalGettoniAmount = computed(() => columnTotal(rows, 'gettoniTotal'))
const totalCombinedAmount = computed(() => columnTotal(rows, 'combinedTotal'))

// Same shape as TournamentSummaryTable.vue, minus format/stage — an event
// has neither (Event, app/types/index.d.ts).
const columns: TableColumn<FinanceEventSummaryRow>[] = [
  {
    accessorKey: 'name',
    header: ({ column }) => sortableHeader(t('finance.summary.event'), column),
    footer: () => t('finance.summary.total'),
    // fallow-ignore-next-line code-duplication -- the startDate column +
    // trailing summaryXColumn calls mirror TournamentSummaryTable.vue's
    // own, but this cell's link target/icon (an event) genuinely differs
    // from a tournament's.
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
  summaryCountColumn('count', t('finance.summary.count'), totalCount),
  summaryCountColumn('gettoniCount', t('finance.summary.gettoniCount'), totalGettoniCount),
  summaryAmountColumn('gettoniTotal', t('finance.summary.gettoniTotal'), amountFormatter, totalGettoniAmount),
  summaryAmountColumn('combinedTotal', t('finance.summary.total'), amountFormatter, totalCombinedAmount),
  summaryAverageColumn('average', t('finance.summary.average'), amountFormatter)
]
</script>

<template>
  <FinanceSummaryCard
    :title="$t('finance.summary.byEventTitle')"
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
