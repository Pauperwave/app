// test\unit\utils\associates\formatPhoneNumber.test.ts
import { describe, expect, it } from 'vitest'
import { formatPhoneNumber } from '~/utils/associates/formatPhoneNumber'

describe('formatPhoneNumber', () => {
  it('formats a valid E.164 number in international format', () => {
    expect(formatPhoneNumber('+393203522674')).toBe('+39 320 352 2674')
  })

  it('returns the raw input when it cannot be parsed as valid', () => {
    expect(formatPhoneNumber('not-a-number')).toBe('not-a-number')
  })

  it('returns an empty string for null/undefined/empty input', () => {
    expect(formatPhoneNumber(null)).toBe('')
    expect(formatPhoneNumber(undefined)).toBe('')
    expect(formatPhoneNumber('')).toBe('')
  })
})
