import type { Associate } from './associate'

export type TransactionStatus = 'paid' | 'failed' | 'refunded'

export interface Transaction {
  id: number
  amount: number
  date: string
  status: TransactionStatus
  associate: Associate
}
