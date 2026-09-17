// test\unit\composables\tournaments\pairing\pairingOptimizer.test.ts
import { describe, expect, it } from 'vitest'
import {
  DEFAULT_PAIRING_WEIGHTS, getForbiddenPairKey, normalizePairingForbiddenPairs,
  optimizePairings, scorePairingTables,
  type PairingPlayer
} from '~/composables/tournaments/pairing/pairingOptimizer'
import type { PairingForbiddenPair } from '~/types'

function makePlayer(overrides: Partial<PairingPlayer> & { id: string }): PairingPlayer {
  return { rank: 1, score: 0, table3Count: 0, ...overrides }
}

describe('getForbiddenPairKey', () => {
  it('is symmetric regardless of argument order', () => {
    expect(getForbiddenPairKey('a', 'b')).toBe(getForbiddenPairKey('b', 'a'))
  })
})

describe('normalizePairingForbiddenPairs', () => {
  it('drops a self-pair', () => {
    const pairs: PairingForbiddenPair[] = [{ playerA: 'a', playerB: 'a' }]
    expect(normalizePairingForbiddenPairs(pairs)).toEqual([])
  })

  it('drops an order-insensitive duplicate, keeping the first occurrence', () => {
    const pairs: PairingForbiddenPair[] = [
      { playerA: 'a', playerB: 'b' },
      { playerA: 'b', playerB: 'a' }
    ]
    expect(normalizePairingForbiddenPairs(pairs)).toEqual([{ playerA: 'a', playerB: 'b' }])
  })

  it('keeps distinct pairs, in their original order', () => {
    const pairs: PairingForbiddenPair[] = [
      { playerA: 'a', playerB: 'b' },
      { playerA: 'c', playerB: 'd' }
    ]
    expect(normalizePairingForbiddenPairs(pairs)).toEqual(pairs)
  })
})

describe('scorePairingTables', () => {
  it('is invalid (isValid: false, -Infinity) when a table contains a forbidden pair', () => {
    const result = scorePairingTables({
      tables: [['a', 'b']],
      players: [makePlayer({ id: 'a' }), makePlayer({ id: 'b' })],
      history: [],
      forbiddenPairs: [{ playerA: 'a', playerB: 'b' }],
      currentRound: 1
    })
    expect(result.isValid).toBe(false)
    expect(result.totalScore).toBe(Number.NEGATIVE_INFINITY)
  })

  it('is valid with a finite score for a conflict-free table', () => {
    const result = scorePairingTables({
      tables: [['a', 'b', 'c', 'd']],
      players: ['a', 'b', 'c', 'd'].map(id => makePlayer({ id })),
      history: [],
      forbiddenPairs: [],
      currentRound: 1
    })
    expect(result.isValid).toBe(true)
    expect(Number.isFinite(result.totalScore)).toBe(true)
  })

  it('maintains the invariant that per-player totals sum to the table total', () => {
    const result = scorePairingTables({
      tables: [['a', 'b', 'c']],
      players: [
        makePlayer({ id: 'a', rank: 1 }),
        makePlayer({ id: 'b', rank: 5, table3Count: 2 }),
        makePlayer({ id: 'c', rank: 3 })
      ],
      history: [{ round: 1, players: ['a', 'b'] }],
      forbiddenPairs: [],
      currentRound: 2
    })
    const table = result.tableScores[0]!
    const summedPlayerTotals = table.players.reduce((sum, p) => sum + p.total, 0)
    expect(summedPlayerTotals).toBeCloseTo(table.total, 10)
  })

  it('scores a never-met pair higher (more novelty) than an identical table with prior history', () => {
    const players = [makePlayer({ id: 'a' }), makePlayer({ id: 'b' })]
    const fresh = scorePairingTables({
      tables: [['a', 'b']], players, history: [], forbiddenPairs: [], currentRound: 2
    })
    const rematch = scorePairingTables({
      tables: [['a', 'b']],
      players,
      history: [{ round: 1, players: ['a', 'b'] }],
      forbiddenPairs: [],
      currentRound: 2
    })
    expect(fresh.totalScore).toBeGreaterThan(rematch.totalScore)
  })

  it('scores a balanced-rank table higher (less spread penalty) than a lopsided one', () => {
    const balanced = scorePairingTables({
      tables: [['a', 'b']],
      players: [makePlayer({ id: 'a', rank: 5 }), makePlayer({ id: 'b', rank: 6 })],
      history: [],
      forbiddenPairs: [],
      currentRound: 1
    })
    const lopsided = scorePairingTables({
      tables: [['a', 'b']],
      players: [makePlayer({ id: 'a', rank: 1 }), makePlayer({ id: 'b', rank: 20 })],
      history: [],
      forbiddenPairs: [],
      currentRound: 1
    })
    expect(balanced.totalScore).toBeGreaterThan(lopsided.totalScore)
  })

  it('applies a custom weight override', () => {
    const players = [makePlayer({ id: 'a' }), makePlayer({ id: 'b' })]
    const withDefaultNovelty = scorePairingTables({
      tables: [['a', 'b']], players, history: [], forbiddenPairs: [], currentRound: 1
    })
    const withZeroNovelty = scorePairingTables({
      tables: [['a', 'b']], players, history: [], forbiddenPairs: [], currentRound: 1,
      weights: { novelty: 0 }
    })
    expect(withZeroNovelty.totalScore).toBeLessThan(withDefaultNovelty.totalScore)
  })
})

describe('optimizePairings', () => {
  it('returns an invalid empty result for an unplayable player count (5, no valid 3/4 split)', () => {
    const players = Array.from({ length: 5 }, (_, i) => makePlayer({ id: `p${i}` }))
    const result = optimizePairings({ players, history: [], forbiddenPairs: [], currentRound: 1 })
    expect(result.tables).toEqual([])
    expect(result.totalScore).toBe(Number.NEGATIVE_INFINITY)
  })

  it('seats every player exactly once, in tables sized 3 or 4', () => {
    const players = Array.from({ length: 11 }, (_, i) => makePlayer({ id: `p${i}`, rank: i + 1 }))
    const result = optimizePairings({ players, history: [], forbiddenPairs: [], currentRound: 1 })

    const seated = result.tables.flat()
    expect(seated.sort()).toEqual(players.map(p => p.id).sort())
    for (const table of result.tables) {
      expect([3, 4]).toContain(table.length)
    }
  })

  it('seats 4 players at a single table', () => {
    const players = Array.from({ length: 4 }, (_, i) => makePlayer({ id: `p${i}` }))
    const result = optimizePairings({ players, history: [], forbiddenPairs: [], currentRound: 1 })
    expect(result.tables).toHaveLength(1)
    expect(result.tables[0]).toHaveLength(4)
    expect(Number.isFinite(result.totalScore)).toBe(true)
  })

  it('avoids seating a forbidden pair together when an alternative split exists', () => {
    const players = Array.from({ length: 6 }, (_, i) => makePlayer({ id: `p${i}`, rank: i + 1 }))
    const result = optimizePairings({
      players,
      history: [],
      forbiddenPairs: [{ playerA: 'p0', playerB: 'p1' }],
      currentRound: 1
    })
    const tableWithP0 = result.tables.find(table => table.includes('p0'))
    expect(tableWithP0?.includes('p1')).toBe(false)
  })
})

describe('DEFAULT_PAIRING_WEIGHTS', () => {
  it('is a complete PairingWeights record', () => {
    expect(Object.keys(DEFAULT_PAIRING_WEIGHTS).sort()).toEqual(
      ['novelty', 'rematch', 'rotateTable3', 'strengthBalance', 'tableSize3', 'tableSize4'].sort()
    )
  })
})
