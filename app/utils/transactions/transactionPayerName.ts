// app\utils\transactions\transactionPayerName.ts
import type { Transaction } from '~/types'

// Shared by useTransactionsTableColumns.ts's payer accessorFn and home/Staff.vue's
// recent-transactions list: a payer is either the linked associate or the external
// payer_name/payer_surname pair, never both
export function transactionPayerName(transaction: Transaction): string {
  const { associate, payer_name, payer_surname } = transaction
  return associate
    ? `${associate.first_name} ${associate.last_name}`
    : (payer_name && payer_surname ? `${payer_name} ${payer_surname}` : '')
}
