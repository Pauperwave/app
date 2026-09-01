// test\unit\utils\transactions\renewalKindBadge.test.ts
import { describe, expect, it } from 'vitest'
import { hasMissingAssociateError, isUnregisteredParticipant } from '~/utils/transactions/renewalKindBadge'
import type { Transaction } from '~/types'

function makeTransaction(overrides: Partial<Transaction>): Transaction {
  return {
    payment_type: 'Association Fee',
    associate: null,
    ...overrides
  } as Transaction
}

describe('hasMissingAssociateError', () => {
  it('is true for an Association Fee with no linked associate', () => {
    expect(hasMissingAssociateError(makeTransaction({ payment_type: 'Association Fee', associate: null }))).toBe(true)
  })

  it('is false when an associate is linked', () => {
    expect(hasMissingAssociateError(makeTransaction({ payment_type: 'Association Fee', associate: { uuid: 'a1' } as never }))).toBe(false)
  })

  it('is false for other payment types', () => {
    expect(hasMissingAssociateError(makeTransaction({ payment_type: 'Donation', associate: null }))).toBe(false)
  })
})

describe('isUnregisteredParticipant', () => {
  it.each(['Tournament Fee', 'Event Fee', 'Token Purchase'])(
    'is true for %s with no linked associate',
    (paymentType) => {
      const transaction = makeTransaction({ payment_type: paymentType, associate: null })
      expect(isUnregisteredParticipant(transaction)).toBe(true)
    }
  )

  it('is false when an associate is linked', () => {
    expect(isUnregisteredParticipant(makeTransaction({ payment_type: 'Tournament Fee', associate: { uuid: 'a1' } as never }))).toBe(false)
  })

  it('excludes Donation deliberately', () => {
    expect(isUnregisteredParticipant(makeTransaction({ payment_type: 'Donation', associate: null }))).toBe(false)
  })

  it('excludes Association Fee (that is hasMissingAssociateError\'s job)', () => {
    expect(isUnregisteredParticipant(makeTransaction({ payment_type: 'Association Fee', associate: null }))).toBe(false)
  })
})
