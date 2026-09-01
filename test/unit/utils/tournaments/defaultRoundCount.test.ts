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
