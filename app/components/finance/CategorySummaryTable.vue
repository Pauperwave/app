<!-- app\components\finance\CategorySummaryTable.vue -->
<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { FinanceCategoryRow } from '~/composables/finance/useFinanceSummary'
import FormatBadge from '~/components/badges/FormatBadge.vue'
import PaymentTypeBadge from '~/components/ui/PaymentTypeBadge.vue'

// fallow-ignore-next-line code-duplication -- see FormatSummaryTable.vue
const { rows, loading, pending = false } = defineProps<{
  rows: FinanceCategoryRow[]
  loading: boolean
  // Genuine first load (no cached rows yet at all) vs. a background refetch
  // keeping stale rows on screen — same isPending/isLoading split as
  // tournaments/locations' own list pages (user request, 2026-08-26).
  // Optional/defaulted since finance/index.vue is this component's only
  // caller today and always passes it, but nothing structurally requires it.
  pending?: boolean
}>()

const { t } = useI18n()

const amountFormatter = AMOUNT_FORMATTER

// Sortable like every other summary table on this page (user request,
// 2026-08-26) — the fixed associationFee/byFormat/eventFee/tokenPurchase/
// donation order from useFinanceSummary.ts's byCategory is still the
// default, just no longer the only order.
const sorting = ref([{ id: 'category', desc: false }])

// Grand total per numeric column, own `footer` on the leftmost column instead
// of a bare blank cell. No footer for `cost` — a unit price isn't a summable
// quantity, same reasoning as MethodCostTable.vue's feeRate column.
const totalCount = computed(() => columnTotal(rows, 'count'))
const totalPaypal = computed(() => columnTotal(rows, 'paypalTotal'))
// fallow-ignore-next-line code-duplication -- totalCash/Pos/Amount + columns array mirrors FormatSummaryTable.vue's own
const totalCash = computed(() => columnTotal(rows, 'cashTotal'))
const totalPos = computed(() => columnTotal(rows, 'posTotal'))
const totalAmount = computed(() => columnTotal(rows, 'total'))

const columns: TableColumn<FinanceCategoryRow>[] = [
  {
    id: 'category',
    // No stable per-row identity needed beyond display — 'format' rows share
    // the same `type`, so accessorFn falls back to `format` itself, unique
    // among those.
    accessorFn: row => row.format ?? row.type,
    header: ({ column }) => sortableHeader(t('finance.summary.category'), column),
    footer: () => t('finance.summary.total'),
    cell: ({ row }) => row.original.type === 'format'
      ? h(FormatBadge, { format: row.original.format!, icon: ICONS.battle })
      : h(PaymentTypeBadge, { type: FINANCE_CATEGORY_PAYMENT_TYPE[row.original.type] })
  },
  {
    accessorKey: 'cost',
    header: ({ column }) => sortableHeader(t('finance.summary.cost'), column),
    meta: { class: { th: 'text-right', td: 'text-right font-mono' } },
    cell: ({ row }) => row.original.cost === null ? '' : amountCell(row.original.cost, amountFormatter)
  },
  summaryCountColumn('count', t('finance.summary.instances'), totalCount),
  {
    accessorKey: 'quantity',
    header: ({ column }) => sortableHeader(t('finance.summary.quantity'), column),
    meta: { class: { th: 'text-right', td: 'text-right font-mono' } },
    cell: ({ row }) => row.original.quantity === null ? '' : String(row.original.quantity)
  },
  summaryAmountColumn('paypalTotal', t('finance.summary.paypalTotal'), amountFormatter, totalPaypal),
  summaryAmountColumn('cashTotal', t('finance.summary.cashTotal'), amountFormatter, totalCash),
  summaryAmountColumn('posTotal', t('finance.summary.posTotal'), amountFormatter, totalPos),
  {
    accessorKey: 'total',
    header: ({ column }) => sortableHeader(t('finance.summary.total'), column),
    meta: { class: { th: 'text-right', td: 'text-right font-mono font-semibold' } },
    cell: ({ row }) => amountCell(row.original.total, amountFormatter),
    footer: () => h('span', { class: 'font-mono font-semibold' }, amountFormatter.format(totalAmount.value))
  }
]
</script>

<template>
  <FinanceSummaryCard
    :title="$t('finance.summary.byCategoryTitle')"
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
