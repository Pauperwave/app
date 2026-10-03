// app\utils\transactions\transactionsGlobalFilterFn.ts
import type { Row } from '@tanstack/vue-table'
import type { Transaction } from '~/types'

// UTable globalFilterFn for /transactions: one search box matching payer name/surname, transaction
// id and receipt number (like associatesGlobalFilterFn.ts). receipt_ref is only set on rows
// imported from the 2026 historical sheet (migration 20260825230000)
const normalize = (value: string) => value.toLowerCase()
const includesQuery = (value: string | null | undefined, query: string) =>
  !!value && normalize(value).includes(query)

export function transactionsGlobalFilterFn(
  row: Row<Transaction>, _columnId: string, filterValue: string
): boolean {
  const query = filterValue.trim().toLowerCase()
  if (!query) return true

  const transaction = row.original
  const firstName = transaction.associate?.first_name ?? transaction.payer_name
  const lastName = transaction.associate?.last_name ?? transaction.payer_surname
  const fullName = `${firstName ?? ''} ${lastName ?? ''}`

  return includesQuery(fullName, query)
    || String(transaction.id).includes(query)
    || includesQuery(transaction.receipt_ref, query)
}
