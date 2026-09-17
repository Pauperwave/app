// test\unit\utils\tournaments\tournamentOrigin.test.ts
import { describe, expect, it } from 'vitest'
import { parseNavigationOrigin, tournamentDetailUrl } from '~/utils/tournaments/tournamentOrigin'

describe('tournamentDetailUrl', () => {
  it('appends a league query param when the tournament belongs to a league', () => {
    expect(tournamentDetailUrl({ uuid: 't1', leagueUuid: 'l1' })).toBe('/tournaments/t1?league=l1')
  })

  it('omits the query param when there is no league', () => {
    expect(tournamentDetailUrl({ uuid: 't1', leagueUuid: null })).toBe('/tournaments/t1')
  })
})

describe('parseNavigationOrigin', () => {
  it('parses a valid league uuid', () => {
    expect(parseNavigationOrigin('l1')).toEqual({ type: 'league', uuid: 'l1' })
  })

  it('rejects an empty string', () => {
    expect(parseNavigationOrigin('')).toBeNull()
  })

  it('rejects non-string input', () => {
    expect(parseNavigationOrigin(undefined)).toBeNull()
    expect(parseNavigationOrigin(null)).toBeNull()
    expect(parseNavigationOrigin(42)).toBeNull()
  })
})
