// test\unit\utils\status\eventStatus.test.ts
import { describe, expect, it } from 'vitest'
import { eventStatusColor } from '~/utils/status/eventStatus'

describe('eventStatusColor', () => {
  it.each([
    ['draft', 'neutral'],
    ['published', 'info'],
    ['ongoing', 'warning'],
    ['completed', 'success'],
    ['cancelled', 'error']
  ] as const)('%s -> %s', (status, color) => {
    expect(eventStatusColor(status)).toBe(color)
  })
})
