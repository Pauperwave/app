// test\unit\composables\tournaments\pairing\useCommanderRankingGrid.test.ts
import { describe, expect, it } from 'vitest'
import { useCommanderRankingGrid } from '~/composables/tournaments/pairing/useCommanderRankingGrid'
import type { TablePlayer } from '~/types'

function makePlayers(count: number): TablePlayer[] {
  return Array.from({ length: count }, (_, i) => ({ value: `p${i}`, label: `Player ${i}` }))
}

describe('useCommanderRankingGrid', () => {
  it('uses a 3x3 grid for 3 players and a 4x4 grid otherwise', () => {
    const three = useCommanderRankingGrid(() => makePlayers(3))
    expect(three.gridSize.value).toBe(3)

    const four = useCommanderRankingGrid(() => makePlayers(4))
    expect(four.gridSize.value).toBe(4)

    const two = useCommanderRankingGrid(() => makePlayers(2))
    expect(two.gridSize.value).toBe(4)
  })

  it('initializes every player at row 0 (rank 1) when there are no saved positions', () => {
    const players = makePlayers(4)
    const { grid, initializeGrid } = useCommanderRankingGrid(() => players)
    initializeGrid()
    expect(grid.value[0]).toEqual(players)
    expect(grid.value[1]).toEqual([null, null, null, null])
  })

  it('restores saved ranks (1-based) into the correct rows', () => {
    const players = makePlayers(4)
    const { grid, initializeGrid } = useCommanderRankingGrid(() => players)
    const saved = new Map([[players[0]!.value, 2], [players[1]!.value, 1]])
    initializeGrid(saved)
    expect(grid.value[1]?.[0]).toEqual(players[0])
    expect(grid.value[0]?.[1]).toEqual(players[1])
  })

  it('falls back to row 0 for an out-of-range saved rank', () => {
    const players = makePlayers(4)
    const { grid, initializeGrid } = useCommanderRankingGrid(() => players)
    const saved = new Map([[players[0]!.value, 99]])
    initializeGrid(saved)
    expect(grid.value[0]?.[0]).toEqual(players[0])
  })

  it('isValidFormation is true when everyone is tied at row 0 (a single used row is trivially gapless)', () => {
    const players = makePlayers(4)
    const { initializeGrid, isValidFormation } = useCommanderRankingGrid(() => players)
    initializeGrid()
    expect(isValidFormation.value).toBe(true)
  })

  it('isValidFormation is true for a proper 1-1-2-3 tie formation (dense, gapless)', () => {
    const players = makePlayers(4)
    const grid = useCommanderRankingGrid(() => players)
    grid.initializeGrid()
    // Move col 2 from row 0 to row 1, col 3 from row 0 to row 2 -- leaves
    // cols 0/1 tied at row 0, col 2 alone at row 1, col 3 alone at row 2.
    grid.handleDragStart(0, 2)
    grid.handleDrop(1, 2)
    grid.handleDragStart(0, 3)
    grid.handleDrop(2, 3)
    expect(grid.isValidFormation.value).toBe(true)
    expect(grid.getRanking()).toEqual(
      expect.arrayContaining([
        { playerUuid: 'p0', position: 1 },
        { playerUuid: 'p1', position: 1 },
        { playerUuid: 'p2', position: 2 },
        { playerUuid: 'p3', position: 3 }
      ])
    )
  })

  it('isValidFormation is false when a rank row is skipped (a gap)', () => {
    const players = makePlayers(4)
    const grid = useCommanderRankingGrid(() => players)
    grid.initializeGrid()
    // Move col 3 straight to row 2, skipping row 1 entirely -- rows used
    // become {0, 2}, not gapless.
    grid.handleDragStart(0, 3)
    grid.handleDrop(2, 3)
    expect(grid.isValidFormation.value).toBe(false)
  })

  it('handleDrop swaps the two occupants of the same column', () => {
    const players = makePlayers(4)
    const grid = useCommanderRankingGrid(() => players)
    grid.initializeGrid()
    grid.handleDragStart(0, 3)
    grid.handleDrop(2, 3) // move p3 alone to row 2 (grid mutated), then swap back
    grid.handleDragStart(2, 3)
    grid.handleDrop(0, 3)
    expect(grid.grid.value[0]?.[3]).toEqual(players[3])
    expect(grid.grid.value[2]?.[3]).toBeNull()
  })

  it('handleDrop is a no-op across different columns', () => {
    const players = makePlayers(4)
    const grid = useCommanderRankingGrid(() => players)
    grid.initializeGrid()
    const before = grid.grid.value.map(row => [...row])
    grid.handleDragStart(0, 0)
    grid.handleDrop(1, 1) // different column than dragged-from
    expect(grid.grid.value).toEqual(before)
  })

  it('handleDrop is a no-op when dropping on the exact same cell', () => {
    const players = makePlayers(4)
    const grid = useCommanderRankingGrid(() => players)
    grid.initializeGrid()
    const before = grid.grid.value.map(row => [...row])
    grid.handleDragStart(0, 0)
    grid.handleDrop(0, 0)
    expect(grid.grid.value).toEqual(before)
  })

  it('handleDragEnd resets the drag state', () => {
    const players = makePlayers(4)
    const grid = useCommanderRankingGrid(() => players)
    grid.initializeGrid()
    grid.handleDragStart(0, 0)
    grid.handleDragEnd()
    expect(grid.isDragging.value).toBe(false)
    expect(grid.draggedFromCol.value).toBeNull()
  })

  it('getRanking returns each player\'s 1-based row as their position', () => {
    const players = makePlayers(3)
    const grid = useCommanderRankingGrid(() => players)
    grid.initializeGrid()
    expect(grid.getRanking()).toEqual([
      { playerUuid: 'p0', position: 1 },
      { playerUuid: 'p1', position: 1 },
      { playerUuid: 'p2', position: 1 }
    ])
  })
})
