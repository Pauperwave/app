// test\unit\utils\tournaments\tournamentTimeRange.test.ts
import { describe, expect, it } from 'vitest'
import { tournamentTimeRange } from '~/utils/tournaments/tournamentTimeRange'

describe('tournamentTimeRange', () => {
  it('renders only the start time when there is no end date', () => {
    expect(tournamentTimeRange('2026-01-01T18:00:00', null)).toBe('18:00')
  })

  it('renders a start-end range when an end date is given', () => {
    expect(tournamentTimeRange('2026-01-01T18:00:00', '2026-01-01T22:30:00')).toBe('18:00 - 22:30')
  })
})
