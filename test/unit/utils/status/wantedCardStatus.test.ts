// test\unit\utils\status\wantedCardStatus.test.ts
import { describe, expect, it } from 'vitest'
import { wantedCardStatusColor } from '~/utils/status/wantedCardStatus'

describe('wantedCardStatusColor', () => {
  it.each([
    ['searching', 'warning'],
    ['found', 'success'],
    ['abandoned', 'neutral']
  ] as const)('%s -> %s', (status, color) => {
    expect(wantedCardStatusColor(status)).toBe(color)
  })
})
