// test\unit\composables\tournaments\pairing\useCommanderStandingsSort.test.ts
import { describe, expect, it } from 'vitest'
import {
  compareCommanderStandings, type StandingSortable
} from '~/composables/tournaments/pairing/useCommanderStandingsSort'

function makeStanding(overrides: Partial<StandingSortable>): StandingSortable {
  return {
    playerUuid: 'p1',
    score: 0,
    victories: 0,
    kills: 0,
    brewReceived: 0,
    playReceived: 0,
    ...overrides
  }
}

describe('compareCommanderStandings', () => {
  it('sorts by score descending first', () => {
    const a = makeStanding({ playerUuid: 'a', score: 10 })
    const b = makeStanding({ playerUuid: 'b', score: 20 })
    expect(compareCommanderStandings(a, b)).toBeGreaterThan(0)
  })

  it('breaks a score tie by victories', () => {
    const a = makeStanding({ playerUuid: 'a', score: 10, victories: 1 })
    const b = makeStanding({ playerUuid: 'b', score: 10, victories: 2 })
    expect(compareCommanderStandings(a, b)).toBeGreaterThan(0)
  })

  it('breaks a score+victories tie by kills', () => {
    const a = makeStanding({ playerUuid: 'a', score: 10, victories: 1, kills: 3 })
    const b = makeStanding({ playerUuid: 'b', score: 10, victories: 1, kills: 5 })
    expect(compareCommanderStandings(a, b)).toBeGreaterThan(0)
  })

  it('breaks a score+victories+kills tie by brew votes received', () => {
    const a = makeStanding({
      playerUuid: 'a', score: 10, victories: 1, kills: 2, brewReceived: 1
    })
    const b = makeStanding({
      playerUuid: 'b', score: 10, victories: 1, kills: 2, brewReceived: 3
    })
    expect(compareCommanderStandings(a, b)).toBeGreaterThan(0)
  })

  it('breaks a tie down to play votes received', () => {
    const a = makeStanding({
      playerUuid: 'a', score: 10, victories: 1, kills: 2, brewReceived: 1, playReceived: 0
    })
    const b = makeStanding({
      playerUuid: 'b', score: 10, victories: 1, kills: 2, brewReceived: 1, playReceived: 4
    })
    expect(compareCommanderStandings(a, b)).toBeGreaterThan(0)
  })

  it('falls back to a stable playerUuid comparison when everything else ties', () => {
    const a = makeStanding({ playerUuid: 'zeta' })
    const b = makeStanding({ playerUuid: 'alpha' })
    expect(compareCommanderStandings(a, b)).toBeGreaterThan(0)
  })

  it('treats null stats as 0 rather than throwing', () => {
    const a = makeStanding({ playerUuid: 'a', score: null, victories: null, kills: null })
    const b = makeStanding({ playerUuid: 'b', score: 0, victories: 0, kills: 0 })
    expect(compareCommanderStandings(a, b)).toBe('a'.localeCompare('b'))
  })
})
