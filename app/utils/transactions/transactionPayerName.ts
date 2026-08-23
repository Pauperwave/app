// app\utils\transactions\transactionPayerName.ts
import type { Transaction } from '~/types'

// Extracted out of useTransactionsTableColumns.ts's payer accessorFn
// (2026-08-19) the moment home/Staff.vue needed the exact same derivation for
// its recent-transactions list — a transaction's payer is either the linked
// associate or the external payer_name/payer_surname pair, never both.
export function transactionPayerName(transaction: Transaction): string {
  const { associate, payer_name, payer_surname } = transaction
  return associate
    ? `${associate.first_name} ${associate.last_name}`
    : (payer_name && payer_surname ? `${payer_name} ${payer_surname}` : '')
}
