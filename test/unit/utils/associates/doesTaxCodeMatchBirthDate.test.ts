// test\unit\utils\associates\doesTaxCodeMatchBirthDate.test.ts
import { describe, expect, it } from 'vitest'
import { doesTaxCodeMatchBirthDate } from '~/utils/associates/doesTaxCodeMatchBirthDate'

describe('doesTaxCodeMatchBirthDate', () => {
  it('matches a male-encoded birth date (day <= 40)', () => {
    // RSSMRA85M01H501Q -> 1985-08-01 (M = August, day 01)
    expect(doesTaxCodeMatchBirthDate('RSSMRA85M01H501Q', new Date(1985, 7, 1))).toBe(true)
  })

  it('matches a female-encoded birth date (day + 40)', () => {
    // day 41 decodes to day 1
    expect(doesTaxCodeMatchBirthDate('RSSMRA85M41H501U', new Date(1985, 7, 1))).toBe(true)
  })

  it('rejects a mismatched date', () => {
    expect(doesTaxCodeMatchBirthDate('RSSMRA85M01H501Q', new Date(1985, 7, 2))).toBe(false)
    expect(doesTaxCodeMatchBirthDate('RSSMRA85M01H501Q', new Date(1986, 7, 1))).toBe(false)
    expect(doesTaxCodeMatchBirthDate('RSSMRA85M01H501Q', new Date(1985, 8, 1))).toBe(false)
  })

  it('rejects a code that is not 16 characters', () => {
    expect(doesTaxCodeMatchBirthDate('RSSMRA85M01H501', new Date(1985, 7, 1))).toBe(false)
  })

  it('rejects a code with an invalid month letter', () => {
    expect(doesTaxCodeMatchBirthDate('RSSMRA85U01H501O', new Date(1985, 7, 1))).toBe(false)
  })
})
