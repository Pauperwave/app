// test\unit\utils\associates\isItalianBirthState.test.ts
import { describe, expect, it } from 'vitest'
import { isItalianBirthState } from '~/utils/associates/isItalianBirthState'

describe('isItalianBirthState', () => {
  it.each([
    ['IT', true],
    ['it', true],
    ['Italia', true],
    ['  italia  ', true],
    ['Repubblica San Marino', false],
    ['', false],
    [null, false],
    [undefined, false]
  ])('%s -> %s', (bornState, expected) => {
    expect(isItalianBirthState(bornState)).toBe(expected)
  })
})
