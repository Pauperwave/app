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

describe('table sizes', () => {
  it('reports the confirmed size of every table, in table order', () => {
    const dnd = useTablePairingDnd(makeTables(PLAYERS))

    expect(dnd.tableSizes.value).toEqual([4, 4])
    expect(dnd.isValid.value).toBe(true)
  })

  it('lets a drag leave a table outside 3-4 players, flagging it only for confirm', () => {
    const dnd = useTablePairingDnd(makeTables(PLAYERS))

    movePlayer(dnd, 'a', 0, 1)

    expect(dnd.tableSizes.value).toEqual([5, 3])
    expect(dnd.isValid.value).toBe(true)
    expect(dnd.tableSizesValid.value).toBe(false)
    expect(dnd.localTables.value.map(table => dnd.tableStatus(table).color))
      .toEqual(['success', 'warning'])
  })

  it('accepts a dragged 3-4 split that differs from the default one', () => {
    const elevenPlayers = [...PLAYERS, 'i', 'j', 'k']
    const dnd = useTablePairingDnd([
      ...makeTables(elevenPlayers),
      {
        id: 'table-3',
        tableNumber: 3,
        seats: ['i', 'j', 'k'].map(id => ({ id: `table-3-player-${id}`, player: { value: id, label: id } }))
      }
    ])

    movePlayer(dnd, 'a', 0, 2)

    expect(dnd.tableSizesValid.value).toBe(true)
    // Tables of 4 are confirmed first, the dragged-down table of 3 last.
    expect(dnd.tableSizes.value).toEqual([4, 4, 3])
    expect(dnd.playerOrder.value).toEqual(['e', 'f', 'g', 'h', 'i', 'j', 'k', 'a', 'b', 'c', 'd'])
  })

  it('randomizing after a resize goes back to valid 3-4 tables', () => {
    const dnd = useTablePairingDnd(makeTables(PLAYERS))

    movePlayer(dnd, 'a', 0, 1)
    dnd.randomizeTables(42)

    expect(dnd.tableSizes.value).toEqual([4, 4])
    expect(dnd.tableSizesValid.value).toBe(true)
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
