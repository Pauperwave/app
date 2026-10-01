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
