// test\unit\utils\tournaments\roundDuration.test.ts
import { describe, expect, it } from 'vitest'
import { defaultRoundMinutesForFormat, is1v1FormatName } from '~/utils/tournaments/roundDuration'

describe('is1v1FormatName', () => {
  it.each([
    ['Pauper', true],
    ['Premodern', true],
    ['Draft', true],
    ['Commander', false],
    ['Cubo Commander', false],
    [undefined, false]
  ])('%s -> %s', (formatName, expected) => {
    expect(is1v1FormatName(formatName)).toBe(expected)
  })
})

describe('defaultRoundMinutesForFormat', () => {
  it('gives 1v1 formats 50 minutes and multiplayer formats 75 by default', () => {
    expect(defaultRoundMinutesForFormat('Pauper')).toBe(50)
    expect(defaultRoundMinutesForFormat('Commander')).toBe(75)
  })

  it('falls back to the multiplayer duration while the format is unknown', () => {
    expect(defaultRoundMinutesForFormat(undefined)).toBe(75)
  })

  it('uses the durations it is given', () => {
    const rules = { commanderRoundMinutes: 90, oneVsOneRoundMinutes: 45 }

    expect(defaultRoundMinutesForFormat('Pauper', rules)).toBe(45)
    expect(defaultRoundMinutesForFormat('Commander', rules)).toBe(90)
  })
})
