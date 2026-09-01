// test\unit\utils\associates\isValidTaxCodeChecksum.test.ts
import { describe, expect, it } from 'vitest'
import { isValidTaxCodeChecksum } from '~/utils/associates/isValidTaxCodeChecksum'

describe('isValidTaxCodeChecksum', () => {
  it('accepts a valid Italian tax code', () => {
    expect(isValidTaxCodeChecksum('RSSMRA85M01H501Q')).toBe(true)
  })

  it('is case-insensitive and trims whitespace', () => {
    expect(isValidTaxCodeChecksum('  rssmra85m01h501q  ')).toBe(true)
  })

  it('rejects a code with a wrong check letter', () => {
    expect(isValidTaxCodeChecksum('RSSMRA85M01H501A')).toBe(false)
  })

  it('rejects a code that is not 16 characters', () => {
    expect(isValidTaxCodeChecksum('RSSMRA85M01H501')).toBe(false)
    expect(isValidTaxCodeChecksum('RSSMRA85M01H501ZZ')).toBe(false)
  })

  it('rejects a code with invalid characters', () => {
    expect(isValidTaxCodeChecksum('RSSMRA85M01H501!')).toBe(false)
  })

  it('rejects an empty string', () => {
    expect(isValidTaxCodeChecksum('')).toBe(false)
  })
})
