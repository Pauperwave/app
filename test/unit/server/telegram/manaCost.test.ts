// test\unit\server\telegram\manaCost.test.ts
import { describe, expect, it } from 'vitest'
import { formatManaCost } from '../../../../server/utils/telegram/commands/cards/manaCost'

describe('formatManaCost', () => {
  it('drops the braces and joins the symbols', () => {
    expect(formatManaCost('{3}{W}')).toBe('3W')
    expect(formatManaCost('{2}{R}{W}')).toBe('2RW')
    expect(formatManaCost('{X}{R}')).toBe('XR')
  })

  it('formats both halves of a split card', () => {
    expect(formatManaCost('{1}{B} // {B}')).toBe('1B // B')
  })

  it('wraps hybrid and phyrexian symbols in parentheses', () => {
    expect(formatManaCost('{W/U}')).toBe('(W/U)')
    expect(formatManaCost('{2/W}')).toBe('(2/W)')
    expect(formatManaCost('{G/P}')).toBe('(G/P)')
  })
})
