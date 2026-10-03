// app\utils\transactions\availableTransactionYears.ts
import type { Transaction } from '~/types'

// Shared by transactions/index.vue and finance/index.vue: every year with a transaction plus the
// current year, newest first
export function availableTransactionYears(transactions: Transaction[]): number[] {
  const years = new Set(transactions.map(
    transaction => new Date(transaction.payment_date).getFullYear()
  ))
  years.add(new Date().getFullYear())
  return [...years].sort((a, b) => b - a)
}
