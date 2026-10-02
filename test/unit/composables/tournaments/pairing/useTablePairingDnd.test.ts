// test\unit\composables\tournaments\pairing\useTablePairingDnd.test.ts
import { describe, expect, it, vi } from 'vitest'
import { useTablePairingDnd } from '~/composables/tournaments/pairing/useTablePairingDnd'
import type { PairingTable } from '~/types'

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }))

// Two tables of four, the players split over them in the given order.
function makeTables(playerIds: string[]): PairingTable[] {
  return [0, 1].map(tableIndex => ({
    id: `table-${tableIndex + 1}`,
    tableNumber: tableIndex + 1,
    seats: playerIds.slice(tableIndex * 4, tableIndex * 4 + 4).map(id => ({
      id: `table-${tableIndex + 1}-player-${id}`,
      player: { value: id, label: `Player ${id}` }
    }))
  }))
}

const PLAYERS = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']

function randomizedOrder(playerIds: string[], seed: number): string[] {
  const dnd = useTablePairingDnd(makeTables(playerIds))
  dnd.randomizeTables(seed)
  return dnd.playerOrder.value
}

describe('randomizeTables', () => {
  it('seats the same players the same way for the same seed', () => {
    expect(randomizedOrder(PLAYERS, 123_456)).toEqual(randomizedOrder(PLAYERS, 123_456))
  })

  it('does not depend on how the players were arranged before', () => {
    const shuffledBefore = ['e', 'a', 'h', 'c', 'g', 'b', 'f', 'd']

    expect(randomizedOrder(shuffledBefore, 777)).toEqual(randomizedOrder(PLAYERS, 777))
  })

  it('seats them differently for a different seed', () => {
    expect(randomizedOrder(PLAYERS, 1)).not.toEqual(randomizedOrder(PLAYERS, 2))
  })

  it('keeps every player exactly once and every table at its size', () => {
    const dnd = useTablePairingDnd(makeTables(PLAYERS))

    dnd.randomizeTables(42)

    expect([...dnd.playerOrder.value].sort()).toEqual(PLAYERS)
    expect(dnd.localTables.value.map(table => table.seats.filter(seat => seat.player).length))
      .toEqual([4, 4])
  })
})

// Moves `playerId` from table `fromIndex` to table `toIndex`, like a cross-table drop.
function movePlayer(
  dnd: ReturnType<typeof useTablePairingDnd>,
  playerId: string,
  fromIndex: number,
  toIndex: number
) {
  const from = dnd.localTables.value[fromIndex]
  const to = dnd.localTables.value[toIndex]
  const seat = from?.seats.find(item => item.player?.value === playerId)
  if (!from || !to || !seat) throw new Error('invalid move')

  dnd.updateTableSeats(toIndex, [...to.seats, seat])
  dnd.updateTableSeats(fromIndex, from.seats.filter(item => item !== seat))
}

// One table per size, players named p1, p2, ... in seat order.
function makeTablesOfSizes(sizes: number[]): PairingTable[] {
  let next = 1
  return sizes.map((size, tableIndex) => ({
    id: `table-${tableIndex + 1}`,
    tableNumber: tableIndex + 1,
    seats: Array.from({ length: size }, () => {
      const id = `p${next++}`
      return { id: `table-${tableIndex + 1}-player-${id}`, player: { value: id, label: id } }
    })
  }))
}

function statusColors(dnd: ReturnType<typeof useTablePairingDnd>) {
  return dnd.localTables.value.map(table => dnd.tableStatus(table).color)
}

function cardWarnings(dnd: ReturnType<typeof useTablePairingDnd>) {
  return dnd.localTables.value.map(table => dnd.tableStatus(table).warning)
}

describe('table rules', () => {
  it('reports the size of every table, in table order', () => {
    const dnd = useTablePairingDnd(makeTablesOfSizes([4, 4, 3]))

    expect(dnd.tableSizes.value).toEqual([4, 4, 3])
    expect(dnd.isValid.value).toBe(true)
  })

  it('accepts any 3-4 split with the tables of 3 last, e.g. five tables of 3', () => {
    const dnd = useTablePairingDnd(makeTablesOfSizes([3, 3, 3, 3, 3]))

    expect(dnd.isValid.value).toBe(true)
    expect(dnd.tableSizes.value).toEqual([3, 3, 3, 3, 3])
  })

  it('lets a drag leave a table outside 3-4 players, warning on its card and blocking confirm', () => {
    const dnd = useTablePairingDnd(makeTables(PLAYERS))

    movePlayer(dnd, 'a', 0, 1)

    expect(dnd.tableSizes.value).toEqual([3, 5])
    expect(statusColors(dnd)).toEqual(['success', 'warning'])
    expect(cardWarnings(dnd)).toEqual([undefined, 'tournament.single.tablePreview.invalidTableSizes'])
    expect(dnd.isValid.value).toBe(false)
    expect(dnd.previewError.value).toBe('tournament.single.tablePreview.invalidTableSizes')
  })

  it('flags a table of 3 seated before a table of 4 and blocks confirm', () => {
    const dnd = useTablePairingDnd(makeTablesOfSizes([4, 4, 3]))

    movePlayer(dnd, 'p1', 0, 2)

    expect(dnd.tableSizes.value).toEqual([3, 4, 4])
    expect(statusColors(dnd)).toEqual(['warning', 'success', 'success'])
    expect(cardWarnings(dnd))
      .toEqual(['tournament.single.tablePreview.threeTableNotLast', undefined, undefined])
    expect(dnd.isValid.value).toBe(false)
    expect(dnd.previewError.value).toBe('tournament.single.tablePreview.threeTablesLast')
  })

  it('ignores empty tables', () => {
    const dnd = useTablePairingDnd(makeTablesOfSizes([4, 0, 4]))

    expect(dnd.tableSizes.value).toEqual([4, 4])
    expect(dnd.isValid.value).toBe(true)
  })

  it('randomizing after a resize goes back to valid tables', () => {
    const dnd = useTablePairingDnd(makeTables(PLAYERS))

    movePlayer(dnd, 'a', 0, 1)
    dnd.randomizeTables(42)

    expect(dnd.tableSizes.value).toEqual([4, 4])
    expect(dnd.isValid.value).toBe(true)
  })
})

describe('round 1 optimizer without history', () => {
  it('keeps the current (shuffled) tables instead of regrouping by registration order', () => {
    const dnd = useTablePairingDnd(makeTables(PLAYERS), { currentRound: 1 })

    dnd.randomizeTables(123)
    const shuffled = dnd.playerOrder.value
    dnd.runOptimizer(30)

    expect(dnd.playerOrder.value).toEqual(shuffled)
  })
})
