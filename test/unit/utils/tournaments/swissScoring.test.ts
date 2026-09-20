// test\unit\utils\tournaments\swissScoring.test.ts
import { describe, expect, it } from 'vitest'
import { calculateSwissStandings, type SwissMatch } from '~/utils/tournaments/swissScoring'

function makeMatch(overrides: Partial<SwissMatch> = {}): SwissMatch {
  return {
    player1Uuid: 'a',
    player2Uuid: 'b',
    player1GamesWon: 2,
    player2GamesWon: 0,
    ...overrides
  }
}

describe('calculateSwissStandings', () => {
  it('gives 3 points for a win, 1 for a draw and 0 for a loss', () => {
    const standings = calculateSwissStandings(['a', 'b', 'c', 'd'], [
      makeMatch({ player1Uuid: 'a', player2Uuid: 'b', player1GamesWon: 2, player2GamesWon: 1 }),
      makeMatch({ player1Uuid: 'c', player2Uuid: 'd', player1GamesWon: 1, player2GamesWon: 1 })
    ])

    const points = Object.fromEntries(standings.map(s => [s.playerUuid, s.matchPoints]))
    expect(points).toEqual({ a: 3, b: 0, c: 1, d: 1 })
  })

  it('counts wins, draws and losses from each player\'s own side', () => {
    const [winner, loser] = calculateSwissStandings(['a', 'b'], [makeMatch()])

    expect(winner).toMatchObject({ playerUuid: 'a', wins: 1, draws: 0, losses: 0 })
    expect(loser).toMatchObject({ playerUuid: 'b', wins: 0, draws: 0, losses: 1 })
  })

  it('sorts by match points first', () => {
    const standings = calculateSwissStandings(['a', 'b'], [
      makeMatch({ player1Uuid: 'a', player2Uuid: 'b', player1GamesWon: 0, player2GamesWon: 2 })
    ])

    expect(standings.map(s => s.playerUuid)).toEqual(['b', 'a'])
  })

  it('breaks a points tie by opponents\' match-win %', () => {
    // x and y both beat one opponent, but x's opponent (p) went on to win a
    // match too while y's opponent (q) lost everything.
    const standings = calculateSwissStandings(['y', 'x', 'p', 'q', 'z'], [
      makeMatch({ player1Uuid: 'x', player2Uuid: 'p' }),
      makeMatch({ player1Uuid: 'y', player2Uuid: 'q' }),
      makeMatch({ player1Uuid: 'p', player2Uuid: 'z' })
    ])

    const ranked = standings.map(s => s.playerUuid)
    expect(ranked.indexOf('x')).toBeLessThan(ranked.indexOf('y'))
  })

  it('floors every percentage at 0.33', () => {
    const [, loser] = calculateSwissStandings(['a', 'b'], [makeMatch()])

    expect(loser?.gw).toBe(0.33)
  })

  it('uses the game-win % as the second tiebreaker', () => {
    // Same points and same (only) opponent pool shape, but a wins 2-0 and c wins 2-1.
    const standings = calculateSwissStandings(['c', 'a', 'b', 'd'], [
      makeMatch({ player1Uuid: 'a', player2Uuid: 'b', player1GamesWon: 2, player2GamesWon: 0 }),
      makeMatch({ player1Uuid: 'c', player2Uuid: 'd', player1GamesWon: 2, player2GamesWon: 1 })
    ])

    const ranked = standings.map(s => s.playerUuid)
    expect(ranked.indexOf('a')).toBeLessThan(ranked.indexOf('c'))
  })

  it('keeps players with no results at the floor and in input order', () => {
    const standings = calculateSwissStandings(['a', 'b'], [])

    expect(standings.map(s => s.playerUuid)).toEqual(['a', 'b'])
    expect(standings[0]).toMatchObject({ matchPoints: 0, omw: 0.33, gw: 0.33, ogw: 0.33 })
  })

  it('scores a bye as a 2-0 match win', () => {
    const [standing] = calculateSwissStandings(['a'], [], ['a'])

    expect(standing).toMatchObject({ matchPoints: 3, wins: 1, draws: 0, losses: 0, gw: 1 })
  })

  it('ignores byes when computing the opponents\' percentages', () => {
    // a beat b and got a bye; b's only opponent is a, and a's opponents ignore the bye.
    const [a] = calculateSwissStandings(['a', 'b'], [makeMatch()], ['a'])

    expect(a?.playerUuid).toBe('a')
    // b lost its only match: match-win % floored at 0.33, a's OMW% is exactly that
    expect(a?.omw).toBe(0.33)
  })

  it('counts the bye round when computing the match-win percentage', () => {
    // 1 win + 1 loss + 1 bye = 6 points / 9 possible: opponents of the bye player see 0.67
    const standings = calculateSwissStandings(['a', 'b', 'c'], [
      makeMatch({ player1Uuid: 'a', player2Uuid: 'b' }),
      makeMatch({ player1Uuid: 'c', player2Uuid: 'a', player1GamesWon: 2, player2GamesWon: 0 })
    ], ['a'])

    const b = standings.find(s => s.playerUuid === 'b')
    expect(b?.omw).toBeCloseTo(6 / 9)
  })

  it('ignores matches involving players outside the list', () => {
    const standings = calculateSwissStandings(['a'], [makeMatch({ player2Uuid: 'ghost' })])

    expect(standings).toHaveLength(1)
    expect(standings[0]?.matchPoints).toBe(3)
  })
})
