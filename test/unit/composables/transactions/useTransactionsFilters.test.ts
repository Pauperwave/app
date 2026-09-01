// test\unit\composables\transactions\useTransactionsFilters.test.ts
import { ref } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import { useTransactionsFilters } from '~/composables/transactions/useTransactionsFilters'
import type { Transaction } from '~/types'

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }))

function makeTransaction(overrides: Partial<Transaction>): Transaction {
  return {
    id: 1,
    payment_type: 'Donation',
    payment_method: 'Cash',
    payment_date: new Date(2026, 8, 15).toISOString(),
    associate: null,
    notes: '',
    ...overrides
  } as unknown as Transaction
}

describe('useTransactionsFilters', () => {
  const range = ref({ start: new Date(2026, 8, 1), end: new Date(2026, 8, 30) })

  it('filters by payment type', () => {
    const transactions = [
      makeTransaction({ id: 1, payment_type: 'Donation' }),
      makeTransaction({ id: 2, payment_type: 'Tournament Fee' })
    ]
    const { filteredTransactions } = useTransactionsFilters(ref(transactions), range, ref('Donation'))
    expect(filteredTransactions.value.map(t => t.id)).toEqual([1])
  })

  it('the "comped" pseudo-type filters by payment_method regardless of payment_type', () => {
    const transactions = [
      makeTransaction({ id: 1, payment_type: 'Donation', payment_method: 'Comped' }),
      makeTransaction({ id: 2, payment_type: 'Tournament Fee', payment_method: 'Comped' }),
      makeTransaction({ id: 3, payment_type: 'Donation', payment_method: 'Cash' })
    ]
    const { filteredTransactions } = useTransactionsFilters(ref(transactions), range, ref('comped'))
    expect(filteredTransactions.value.map(t => t.id)).toEqual([1, 2])
  })

  it('the "errors" pseudo-type bypasses the date range', () => {
    const transactions = [
      makeTransaction({
        id: 1,
        payment_type: 'Association Fee',
        associate: null,
        payment_date: new Date(2020, 0, 1).toISOString()
      })
    ]
    const { filteredTransactions } = useTransactionsFilters(ref(transactions), range, ref('errors'))
    expect(filteredTransactions.value.map(t => t.id)).toEqual([1])
  })

  it('excludes transactions outside the date range for a normal type filter', () => {
    const transactions = [
      makeTransaction({ id: 1, payment_type: 'Donation', payment_date: new Date(2020, 0, 1).toISOString() })
    ]
    const { filteredTransactions } = useTransactionsFilters(ref(transactions), range, ref('Donation'))
    expect(filteredTransactions.value).toEqual([])
  })

  it('counts errored and comped transactions from the unfiltered data', () => {
    const transactions = [
      makeTransaction({ id: 1, payment_type: 'Association Fee', associate: null }),
      makeTransaction({ id: 2, payment_method: 'Comped' })
    ]
    const { typeTabs } = useTransactionsFilters(ref(transactions), range, ref('all'))
    expect(typeTabs.value.find(tab => tab.value === 'errors')?.count).toBe(1)
    expect(typeTabs.value.find(tab => tab.value === 'comped')?.count).toBe(1)
  })
})
