// test\unit\utils\tournaments\defaultRoundCount.test.ts
import { describe, expect, it } from 'vitest'
import { defaultRoundCountForFormat } from '~/utils/tournaments/defaultRoundCount'

describe('defaultRoundCountForFormat', () => {
  it.each([
    ['Draft', 4],
    ['Pauper', 4],
    ['Premodern', 4],
    ['Commander', 2],
    ['SomeUnknownFormat', 2]
  ])('%s -> %i rounds', (formatName, rounds) => {
    expect(defaultRoundCountForFormat(formatName)).toBe(rounds)
  })

  it('falls back to the default when no format is given', () => {
    expect(defaultRoundCountForFormat(undefined)).toBe(2)
  })
})

describe('defaultRoundCountForFormat with custom rules', () => {
  const rules = { defaultRoundCount: 3, roundCountByFormat: { Pauper: 5 } }

  it('uses the per-format count when there is one', () => {
    expect(defaultRoundCountForFormat('Pauper', rules)).toBe(5)
  })

  it('falls back to the default round count otherwise', () => {
    expect(defaultRoundCountForFormat('Commander', rules)).toBe(3)
    expect(defaultRoundCountForFormat(undefined, rules)).toBe(3)
  })
})
