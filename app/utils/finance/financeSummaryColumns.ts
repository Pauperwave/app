// app\utils\finance\financeSummaryColumns.ts
// Extracted out of Category/Event/Format/Method/Tournament/TypeSummaryTable.vue
// (2026-08-29, fallow:dupes) — every one of them repeated the same four
// column shapes (a right-aligned running count, a right-aligned currency
// total with a summed footer, a currency average with no footer, and a
// percent share with a "100%" footer), differing only in accessorKey/header/
// which total ref to sum. MonthSummaryTable.vue's per-payment-type columns
// use accessorFn instead of accessorKey (dynamic column per PAYMENT_TYPES
// entry), so they don't fit these signatures and stay hand-written there.
import { h } from 'vue'
import type { TableColumn } from '@nuxt/ui'

const RIGHT_ALIGN_META = { class: { th: 'text-right', td: 'text-right font-mono' } } as const

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

// No footer variant — an "average" column has no meaningful plain sum;
// tables that want one compute their own (e.g. TournamentSummaryTable.vue's
// averageOfAverages, the mean of each row's own average, not
// totalAmount / totalCount).
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
