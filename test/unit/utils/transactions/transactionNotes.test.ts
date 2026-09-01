// test\unit\utils\transactions\transactionNotes.test.ts
import { describe, expect, it } from 'vitest'
import { parseTransactionNotes } from '~/utils/transactions/transactionNotes'

describe('parseTransactionNotes', () => {
  it('flags the unknown-email marker and strips it from the clean notes', () => {
    const result = parseTransactionNotes('email sconosciuta, generata per import storico')
    expect(result.hasUnknownEmail).toBe(true)
    expect(result.cleanNotes).toBe('')
  })

  it('strips the marker but keeps surrounding text', () => {
    const result = parseTransactionNotes('Pagamento contanti - email sconosciuta, generata per import storico')
    expect(result.hasUnknownEmail).toBe(true)
    expect(result.cleanNotes).toBe('Pagamento contanti -')
  })

  it('leaves ordinary notes untouched', () => {
    const result = parseTransactionNotes('Pagamento in contanti a evento')
    expect(result.hasUnknownEmail).toBe(false)
    expect(result.cleanNotes).toBe('Pagamento in contanti a evento')
  })

  it('handles empty notes', () => {
    const result = parseTransactionNotes('')
    expect(result.hasUnknownEmail).toBe(false)
    expect(result.cleanNotes).toBe('')
  })
})
