// test\unit\utils\associates\associatesGlobalFilterFn.test.ts
import { describe, expect, it } from 'vitest'
import type { Row } from '@tanstack/vue-table'
import type { Associate } from '~/types'
import { associatesGlobalFilterFn, createAssociatesGlobalFilterFn } from '~/utils/associates/associatesGlobalFilterFn'

const row = {
  original: {
    uuid: 'abc',
    first_name: 'Mario',
    last_name: 'Rossi',
    email_address: 'mario@example.com',
    phone_number: '+393331234567',
    tax_code: 'RSSMRA80A01H501U'
  }
} as Row<Associate>

describe('associatesGlobalFilterFn', () => {
  it('matches everything on an empty query', () => {
    expect(associatesGlobalFilterFn(row, 'any', '  ')).toBe(true)
  })

  it('matches the phone number', () => {
    expect(associatesGlobalFilterFn(row, 'any', '3331234')).toBe(true)
  })

  it('does not match a Telegram nickname without a lookup', () => {
    expect(associatesGlobalFilterFn(row, 'any', 'supermario')).toBe(false)
  })
})

describe('createAssociatesGlobalFilterFn', () => {
  const withNickname = createAssociatesGlobalFilterFn(uuid => (uuid === 'abc' ? 'SuperMario99' : null))

  it('matches the Telegram nickname case-insensitively', () => {
    expect(withNickname(row, 'any', 'supermario')).toBe(true)
  })

  it('does not match an unrelated nickname query', () => {
    expect(withNickname(row, 'any', 'luigi99')).toBe(false)
  })
})
