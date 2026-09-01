// test\unit\utils\status\leagueStatus.test.ts
import { describe, expect, it } from 'vitest'
import { leagueStatusColor } from '~/utils/status/leagueStatus'

describe('leagueStatusColor', () => {
  it.each([
    ['draft', 'neutral'],
    ['active', 'info'],
    ['completed', 'success'],
    ['cancelled', 'error']
  ] as const)('%s -> %s', (status, color) => {
    expect(leagueStatusColor(status)).toBe(color)
  })
})
