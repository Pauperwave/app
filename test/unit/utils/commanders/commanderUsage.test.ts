// test\unit\utils\commanders\commanderUsage.test.ts
import { describe, expect, it } from 'vitest'
import {
  buildCommanderUsageByPlayer, sortCommandersByRecency, type UsageDeck, type UsageResultRow
} from '#shared/utils/commanders/commanderUsage'

const decks: UsageDeck[] = [
  { uuid: 'solo', commander1Name: 'Atraxa', commander2Name: null },
  { uuid: 'pair', commander1Name: 'Thrasios', commander2Name: 'Tymna' }
]

function result(overrides: Partial<UsageResultRow>): UsageResultRow {
  return {
    playerUuid: 'p1',
    commanderDeckUuid: 'solo',
    createdAt: '2026-09-01T18:00:00Z',
    ...overrides
  }
}

describe('buildCommanderUsageByPlayer', () => {
  it('counts the rounds and keeps the most recent day per commander', () => {
    const usage = buildCommanderUsageByPlayer([
      result({ createdAt: '2026-08-01T10:00:00Z' }),
      result({ createdAt: '2026-09-10T10:00:00Z' }),
      result({ createdAt: '2026-09-05T10:00:00Z' })
    ], decks).get('p1')

    expect(usage?.get('Atraxa')).toEqual({ lastPlayedDay: '2026-09-10', count: 3 })
  })

  it('counts both commanders of a partner pair', () => {
    const usage = buildCommanderUsageByPlayer([result({ commanderDeckUuid: 'pair' })], decks).get('p1')

    expect(usage?.get('Thrasios')?.count).toBe(1)
    expect(usage?.get('Tymna')?.count).toBe(1)
  })

  it('keeps each player\'s history apart', () => {
    const byPlayer = buildCommanderUsageByPlayer([
      result({ playerUuid: 'p1' }),
      result({ playerUuid: 'p2', commanderDeckUuid: 'pair' })
    ], decks)

    expect([...(byPlayer.get('p1')?.keys() ?? [])]).toEqual(['Atraxa'])
    expect([...(byPlayer.get('p2')?.keys() ?? [])]).toEqual(['Thrasios', 'Tymna'])
  })

  it('skips rows without a deck, or with a deck that is unknown', () => {
    const byPlayer = buildCommanderUsageByPlayer([
      result({ commanderDeckUuid: null }),
      result({ commanderDeckUuid: 'gone' })
    ], decks)

    expect(byPlayer.size).toBe(0)
  })
})

describe('sortCommandersByRecency', () => {
  it('puts the most recently played first', () => {
    const sorted = sortCommandersByRecency(new Map([
      ['Old', { lastPlayedDay: '2026-01-01', count: 9 }],
      ['New', { lastPlayedDay: '2026-09-01', count: 1 }]
    ]))

    expect(sorted.map(entry => entry.name)).toEqual(['New', 'Old'])
  })

  it('breaks a tie on the same day by play count', () => {
    const sorted = sortCommandersByRecency(new Map([
      ['Rare', { lastPlayedDay: '2026-09-01', count: 1 }],
      ['Often', { lastPlayedDay: '2026-09-01', count: 4 }]
    ]))

    expect(sorted.map(entry => entry.name)).toEqual(['Often', 'Rare'])
  })
})
