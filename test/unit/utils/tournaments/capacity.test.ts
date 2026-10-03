// test\unit\utils\tournaments\capacity.test.ts
import { describe, expect, it } from 'vitest'
import {
  NO_SHOW_STATUS,
  countTakenSeats,
  isTournamentFull
} from '#shared/utils/tournaments/capacity'

describe('countTakenSeats', () => {
  it('counts the registrations of each tournament', () => {
    const taken = countTakenSeats([
      { tournament_uuid: 't1', status: 'registered' },
      { tournament_uuid: 't1', status: 'pending' },
      { tournament_uuid: 't2', status: 'registered' }
    ])

    expect(taken.get('t1')).toBe(2)
    expect(taken.get('t2')).toBe(1)
  })

  it('does not count a no-show: they give their place back', () => {
    const taken = countTakenSeats([
      { tournament_uuid: 't1', status: 'registered' },
      { tournament_uuid: 't1', status: NO_SHOW_STATUS }
    ])

    expect(taken.get('t1')).toBe(1)
  })

  it('has no entry for a tournament nobody registered for', () => {
    expect(countTakenSeats([]).get('t1')).toBeUndefined()
  })
})

describe('isTournamentFull', () => {
  it('is full once the places taken reach the cap', () => {
    expect(isTournamentFull(8, 8)).toBe(true)
    expect(isTournamentFull(8, 9)).toBe(true)
  })

  it('is not full below the cap', () => {
    expect(isTournamentFull(8, 7)).toBe(false)
  })

  it('is never full without a cap', () => {
    expect(isTournamentFull(null, 100)).toBe(false)
    expect(isTournamentFull(undefined, 100)).toBe(false)
    expect(isTournamentFull(0, 100)).toBe(false)
  })
})
