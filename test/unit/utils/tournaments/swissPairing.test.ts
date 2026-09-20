// test\unit\utils\tournaments\swissPairing.test.ts
import { describe, expect, it } from 'vitest'
import { pairSwissRound } from '~/utils/tournaments/swissPairing'

describe('pairSwissRound', () => {
  it('pairs consecutive ranked players when nobody has met', () => {
    expect(pairSwissRound(['a', 'b', 'c', 'd'], [])).toEqual(['a', 'b', 'c', 'd'])
  })

  it('skips a rematch and pairs with the next-best player', () => {
    expect(pairSwissRound(['a', 'b', 'c', 'd'], [['a', 'b']])).toEqual(['a', 'c', 'b', 'd'])
  })

  it('treats a played pair the same in either order', () => {
    expect(pairSwissRound(['a', 'b', 'c', 'd'], [['b', 'a']])).toEqual(['a', 'c', 'b', 'd'])
  })

  it('backtracks when the greedy choice leaves the rest without a valid pairing', () => {
    // a-b would strand c-d, who already met, so a must go with c instead.
    const result = pairSwissRound(['a', 'b', 'c', 'd'], [['c', 'd']])

    expect(result).toEqual(['a', 'c', 'b', 'd'])
  })

  it('falls back to the ranked order when every pairing would be a rematch', () => {
    const everyPair: [string, string][] = [['a', 'b'], ['a', 'c'], ['a', 'd'], ['b', 'c'], ['b', 'd'], ['c', 'd']]

    expect(pairSwissRound(['a', 'b', 'c', 'd'], everyPair)).toEqual(['a', 'b', 'c', 'd'])
  })

  it('gives the bye to the last-ranked player and puts it last', () => {
    expect(pairSwissRound(['a', 'b', 'c'], [])).toEqual(['a', 'b', 'c'])
  })

  it('pairs the rest without rematches when there is a bye', () => {
    const result = pairSwissRound(['a', 'b', 'c', 'd', 'e'], [['a', 'b']])

    expect(result).toEqual(['a', 'c', 'b', 'd', 'e'])
  })

  it('gives the bye to the lowest-ranked player who has not had one yet', () => {
    const result = pairSwissRound(['a', 'b', 'c', 'd', 'e'], [], ['e'])

    expect(result).toEqual(['a', 'b', 'c', 'e', 'd'])
  })

  it('never skips past a player who has not had a bye: the lowest eligible one sits out', () => {
    const result = pairSwissRound(['a', 'b', 'c', 'd', 'e'], [], ['d', 'e'])

    expect(result.at(-1)).toBe('c')
  })

  it('falls back to the last-ranked player when everybody already had a bye', () => {
    const result = pairSwissRound(['a', 'b', 'c'], [], ['a', 'b', 'c'])

    expect(result.at(-1)).toBe('c')
  })

  it('returns a single player unchanged', () => {
    expect(pairSwissRound(['a'], [])).toEqual(['a'])
  })
})
