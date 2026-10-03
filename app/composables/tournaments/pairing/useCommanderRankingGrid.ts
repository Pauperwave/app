// app\composables\tournaments\pairing\useCommanderRankingGrid.ts
import type { TablePlayer } from '~/types'
// Drag-and-drop dense-rank grid state for TableScoreGridModal.vue, ported from league's
// useRankingGrid.ts (ranking-entry logic and grid mechanic as-is: each player has a fixed lane and
// only moves vertically within it, not a row-based reinterpretation).
//
// Model: a size×size grid where each COLUMN is a fixed player seat and the ROW a player occupies is
// their rank (row 0 = 1st). A drag only moves a token within its own column; dropping onto an
// occupied cell swaps the two occupants (like league's handleDrop). Native HTML5 drag events, not
// VueDraggable/Sortable.js (no "confined to one list-of-one column" concept), as league does.
//
// Validation: the set of occupied rows must be gapless from row 0 (rows [0,0,1,2] is valid: two
// tied at rank 1, then 2, then 3; [0,0,2,3] with an empty row 1 is not).
export function useCommanderRankingGrid(players: () => TablePlayer[]) {
  const gridSize = computed(() => (players().length === 3 ? 3 : 4))
  const rankRange = computed(() => Array.from({ length: gridSize.value }, (_, i) => i))

  // grid[row][col] — col is the player's fixed seat, row is their current rank.
  const grid = ref<(TablePlayer | null)[][]>([])

  const isDragging = ref(false)
  const draggedFromCell = ref<{ row: number, col: number } | null>(null)
  const draggedFromCol = ref<number | null>(null)

  const isValidFormation = computed(() => {
    const size = gridSize.value

    const formation: (number | null)[] = Array(size).fill(null)
    for (let col = 0; col < size; col++) {
      for (let row = 0; row < size; row++) {
        if (grid.value[row]?.[col]) {
          formation[col] = row
          break
        }
      }
    }

    if (formation.some(r => r === null)) return false

    const usedRows = [...new Set(formation as number[])].sort((a, b) => a - b)
    return usedRows.every((row, i) => row === i)
  })

  function initializeGrid(savedPositions?: Map<string, number> | null) {
    const size = gridSize.value
    const newGrid: (TablePlayer | null)[][] = Array.from({ length: size }, () =>
      Array<TablePlayer | null>(size).fill(null))

    players().forEach((player, col) => {
      if (col >= size) return
      const savedRank = savedPositions?.get(player.value)
      const row = savedRank && savedRank >= 1 && savedRank <= size ? savedRank - 1 : 0
      const targetRow = newGrid[row]
      if (targetRow) targetRow[col] = player
    })

    grid.value = newGrid
  }

  function handleDragStart(row: number, col: number) {
    isDragging.value = true
    draggedFromCell.value = { row, col }
    draggedFromCol.value = col
  }

  function handleDrop(row: number, col: number) {
    const from = draggedFromCell.value
    if (!from) return
    // Constraint: a token only ever moves within its own column.
    if (from.col !== col || (from.row === row && from.col === col)) {
      draggedFromCell.value = null
      return
    }

    const newGrid = grid.value.map(r => [...r])
    const fromSeat = newGrid[from.row]?.[from.col] ?? null
    const toSeat = newGrid[row]?.[col] ?? null
    const targetRow = newGrid[row]
    const sourceRow = newGrid[from.row]
    if (targetRow) targetRow[col] = fromSeat
    if (sourceRow) sourceRow[from.col] = toSeat

    grid.value = newGrid
    draggedFromCell.value = null
  }

  function handleDragEnd() {
    isDragging.value = false
    draggedFromCell.value = null
    draggedFromCol.value = null
  }

  /** Ordered (dense rank, ties share a position) list — position is 1-based. */
  function getRanking(): { playerUuid: string, position: number }[] {
    const size = gridSize.value
    const entries: { playerUuid: string, position: number }[] = []
    for (let col = 0; col < size; col++) {
      for (let row = 0; row < size; row++) {
        const player = grid.value[row]?.[col]
        if (player) {
          entries.push({ playerUuid: player.value, position: row + 1 })
          break
        }
      }
    }
    return entries
  }

  return {
    grid,
    gridSize,
    rankRange,
    isDragging,
    draggedFromCol,
    isValidFormation,
    initializeGrid,
    handleDragStart,
    handleDrop,
    handleDragEnd,
    getRanking
  }
}
