// test\unit\utils\tournaments\defaultRoundCount.test.ts
import { describe, expect, it } from 'vitest'
import { defaultRoundCountForFormat } from '~/utils/tournaments/defaultRoundCount'

describe('defaultRoundCountForFormat', () => {
  it.each([
    ['Draft', 4],
    ['Pauper', 4],
    ['Premodern', 4],
    ['SomeUnknownFormat', 4],
    ['Commander', 2],
    ['Cubo Commander', 2]
  ])('%s -> %i rounds', (formatName, rounds) => {
    expect(defaultRoundCountForFormat(formatName)).toBe(rounds)
  })

  it('falls back to the Commander count when no format is given', () => {
    expect(defaultRoundCountForFormat(undefined)).toBe(2)
  })
})

describe('defaultRoundCountForFormat with custom rules', () => {
  const rules = { commanderRoundCount: 3, oneVsOneRoundCount: 5 }

  it('uses the 1v1 count for a 1v1 format', () => {
    expect(defaultRoundCountForFormat('Pauper', rules)).toBe(5)
  })

  it('uses the Commander count for a multiplayer format', () => {
    expect(defaultRoundCountForFormat('Commander', rules)).toBe(3)
  })
})
