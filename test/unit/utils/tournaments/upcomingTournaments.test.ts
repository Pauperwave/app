// test\unit\utils\tournaments\upcomingTournaments.test.ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { upcomingTournaments } from '~/utils/tournaments/upcomingTournaments'
import type { Tournament } from '~/types'

function makeTournament(overrides: Partial<Tournament>): Tournament {
  return { uuid: 'x', startDate: new Date().toISOString(), status: 'registration_open', ...overrides } as Tournament
}

describe('upcomingTournaments', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 8, 1))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('includes a tournament happening today', () => {
    const t = makeTournament({ uuid: 't1', startDate: new Date(2026, 8, 1).toISOString() })
    expect(upcomingTournaments([t])).toEqual([t])
  })

  it('includes a future tournament', () => {
    const t = makeTournament({ uuid: 't1', startDate: new Date(2026, 8, 10).toISOString() })
    expect(upcomingTournaments([t])).toEqual([t])
  })

  it('excludes a past tournament', () => {
    const t = makeTournament({ uuid: 't1', startDate: new Date(2026, 7, 1).toISOString() })
    expect(upcomingTournaments([t])).toEqual([])
  })

  it('excludes a completed or cancelled tournament even if its date is in the future', () => {
    const completed = makeTournament({ uuid: 't1', startDate: new Date(2026, 8, 10).toISOString(), status: 'completed' })
    const cancelled = makeTournament({ uuid: 't2', startDate: new Date(2026, 8, 10).toISOString(), status: 'cancelled' })
    expect(upcomingTournaments([completed, cancelled])).toEqual([])
  })

  it('respects the limit', () => {
    const tournaments = Array.from({ length: 10 }, (_, i) =>
      makeTournament({ uuid: `t${i}`, startDate: new Date(2026, 8, 10).toISOString() }))
    expect(upcomingTournaments(tournaments, 3)).toHaveLength(3)
  })
})
