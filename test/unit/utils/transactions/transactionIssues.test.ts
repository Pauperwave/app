// test\unit\utils\transactions\transactionIssues.test.ts
import { describe, expect, it } from 'vitest'
import { needsAttention } from '~/utils/transactions/transactionIssues'
import type { Transaction } from '~/types'

function makeTransaction(overrides: Partial<Transaction>): Transaction {
  return {
    payment_type: 'Donation',
    associate: { uuid: 'a1' } as never,
    notes: '',
    ...overrides
  } as Transaction
}

describe('needsAttention', () => {
  it('is false for a normal, fully-linked transaction', () => {
    expect(needsAttention(makeTransaction({}))).toBe(false)
  })

  it('flags a missing-associate Association Fee', () => {
    expect(needsAttention(makeTransaction({ payment_type: 'Association Fee', associate: null }))).toBe(true)
  })

  it('flags an unregistered participant (Tournament/Event/Token Purchase with no associate)', () => {
    expect(needsAttention(makeTransaction({ payment_type: 'Tournament Fee', associate: null }))).toBe(true)
  })

  it('flags the unknown-email import marker regardless of payment_type', () => {
    expect(needsAttention(makeTransaction({
      payment_type: 'Donation',
      notes: 'email sconosciuta, generata per import storico'
    }))).toBe(true)
  })
})
