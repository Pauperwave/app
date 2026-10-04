// test\unit\server\telegram\manaCost.test.ts
import { describe, expect, it } from 'vitest'
import { formatManaCost } from '../../../../server/utils/telegram/commands/cards/manaCost'

describe('formatManaCost', () => {
  it('turns generic and colored symbols into a number and colored dots', () => {
    expect(formatManaCost('{3}{W}')).toBe('3⚪')
    expect(formatManaCost('{2}{R}{W}')).toBe('2🔴⚪')
  })

  it('keeps X as text', () => {
    expect(formatManaCost('{X}{R}')).toBe('X🔴')
  })

  it('formats both halves of a split card', () => {
    expect(formatManaCost('{1}{B} // {B}')).toBe('1⚫ // ⚫')
  })

  it('wraps hybrid and phyrexian symbols in parentheses', () => {
    expect(formatManaCost('{W/U}')).toBe('(⚪/🔵)')
    expect(formatManaCost('{2/W}')).toBe('(2/⚪)')
    expect(formatManaCost('{G/P}')).toBe('(🟢/P)')
  })

  it('shows colorless and snow mana as their own glyphs', () => {
    expect(formatManaCost('{C}{S}')).toBe('💎❄️')
  })
})
