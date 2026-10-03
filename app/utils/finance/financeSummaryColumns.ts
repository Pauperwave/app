// app\utils\finance\financeSummaryColumns.ts
// The four column shapes every Category/Event/Format/Method/Tournament/TypeSummaryTable.vue
// repeated: a right-aligned count, a currency total with a summed footer, a currency average with
// no footer and a percent share with a "100%" footer. MonthSummaryTable.vue's per-payment-type
// columns use accessorFn (dynamic per PAYMENT_TYPES) and stay hand-written.
import { h } from 'vue'
import type { TableColumn } from '@nuxt/ui'

const RIGHT_ALIGN_META = { class: { th: 'text-right', td: 'text-right font-mono' } } as const

// Footer total of one numeric column (totalCount/totalAmount/totalCash/...): the same reduce,
// differing only by key
export function columnTotal<T>(rows: T[], key: Extract<keyof T, string>): number {
  return rows.reduce((sum, row) => sum + (row[key] as number), 0)
}

function totalSpan(text: string) {
  return h('span', { class: 'font-mono font-semibold' }, text)
}

export function summaryCountColumn<T>(
  accessorKey: Extract<keyof T, string>,
  header: string,
  total: ComputedRef<number>
): TableColumn<T> {
  return {
    accessorKey,
    header: ({ column }) => sortableHeader(header, column),
    meta: RIGHT_ALIGN_META,
    footer: () => totalSpan(String(total.value))
  }
}

export function summaryAmountColumn<T>(
  accessorKey: Extract<keyof T, string>,
  header: string,
  amountFormatter: Intl.NumberFormat,
  total: ComputedRef<number>
): TableColumn<T> {
  return {
    accessorKey,
    header: ({ column }) => sortableHeader(header, column),
    meta: RIGHT_ALIGN_META,
    cell: ({ getValue }) => amountCell(getValue<number>(), amountFormatter),
    footer: () => totalSpan(amountFormatter.format(total.value))
  }
}

// No footer variant: an "average" column has no meaningful plain sum; tables compute their own
// (e.g. TournamentSummaryTable.vue's averageOfAverages, the mean of each row's average, not
// totalAmount / totalCount)
export function summaryAverageColumn<T>(
  accessorKey: Extract<keyof T, string>,
  header: string,
  amountFormatter: Intl.NumberFormat
): TableColumn<T> {
  return {
    accessorKey,
    header: ({ column }) => sortableHeader(header, column),
    meta: RIGHT_ALIGN_META,
    cell: ({ getValue }) => amountCell(getValue<number>(), amountFormatter)
  }
}

export function summaryShareColumn<T>(
  accessorKey: Extract<keyof T, string>,
  header: string,
  percentFormatter: Intl.NumberFormat
): TableColumn<T> {
  return {
    accessorKey,
    header: ({ column }) => sortableHeader(header, column),
    meta: RIGHT_ALIGN_META,
    cell: ({ getValue }) => percentFormatter.format(getValue<number>()),
    footer: () => totalSpan(percentFormatter.format(1))
  }
}
