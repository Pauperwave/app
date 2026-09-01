// test\unit\utils\status\tournamentStatus.test.ts
import { describe, expect, it } from 'vitest'
import { tournamentStatusBgClass, tournamentStatusColor } from '~/utils/status/tournamentStatus'

describe('tournamentStatusColor', () => {
  it.each([
    ['draft', 'neutral'],
    ['registration_open', 'info'],
    ['in_progress', 'warning'],
    ['completed', 'success'],
    ['cancelled', 'error']
  ] as const)('%s -> %s', (status, color) => {
    expect(tournamentStatusColor(status)).toBe(color)
  })
})

describe('tournamentStatusBgClass', () => {
  it('gives draft a bordered class rather than bg-neutral', () => {
    expect(tournamentStatusBgClass('draft')).toBe('bg-elevated border-2 border-accented')
  })

  it.each([
    ['in_progress', 'bg-warning'],
    ['completed', 'bg-success'],
    ['cancelled', 'bg-error'],
    ['registration_open', 'bg-info']
  ] as const)('%s -> %s', (status, expected) => {
    expect(tournamentStatusBgClass(status)).toBe(expected)
  })
})
