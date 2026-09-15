// app\composables\tournaments\useCommanderRankingGrid.ts
import type { TablePlayer } from '~/types'
// Drag-and-drop dense-rank grid state for TableScoreGridModal.vue — ported
// from MagicTheGathering/league's useRankingGrid.ts (user request,
// 2026-09-15/16: copy the ranking-entry logic as-is), rebuilt on
// vue-draggable-plus's VueDraggable instead of league's native HTML5 drag
// events, per this app's own DnD convention (PodsManager.vue, TableCard.vue
// under components/tournaments/single/pairing/).
//
// League models this as a fixed player-columns × rank-rows grid (a token can
// only move vertically within its own column). VueDraggable has no native
// concept of "columns" — it operates on sortable lists — so this is
// remodeled as N rank ROWS, each its own VueDraggable list, all sharing one
// drag group so a player chip can move freely between rows (rank rows can
// hold 0+ players, for ties). This is behaviorally equivalent: "move a
// token to a different row" IS "change that player's rank" either way, the
// column constraint in league's version never let a token change identity —
// it only ever moved within its own lane.
//
// Validation rule unchanged: the set of non-empty rows must be a gapless
// sequence starting from row 0 (e.g. rows [0,0,1,2] used is valid — two
// players tied at rank 1, then rank 2, then rank 3 — but [0,0,2,3] with an
// empty row 1 is not).
export function useCommanderRankingGrid(players: () => TablePlayer[]) {
  const gridSize = computed(() => (players().length === 3 ? 3 : 4))
  const rankRange = computed(() => Array.from({ length: gridSize.value }, (_, i) => i))

  // rows[i] = the players currently tied at rank i+1.
  const rows = ref<TablePlayer[][]>([])

  const isValidFormation = computed(() => {
    const placedCount = rows.value.reduce((sum, row) => sum + row.length, 0)
    if (placedCount !== players().length) return false

    const usedRows = rows.value
      .map((row, index) => (row.length > 0 ? index : null))
      .filter((index): index is number => index !== null)

    return usedRows.every((rowIndex, i) => rowIndex === i)
  })

  function initializeGrid(savedPositions?: Map<string, number> | null) {
    const size = gridSize.value
    const newRows: TablePlayer[][] = Array.from({ length: size }, () => [])

    for (const player of players()) {
      const savedRank = savedPositions?.get(player.value)
      const rowIndex = savedRank && savedRank >= 1 && savedRank <= size ? savedRank - 1 : 0
      newRows[rowIndex]?.push(player)
    }

    rows.value = newRows
  }

  function updateRow(rowIndex: number, value: TablePlayer[]) {
    rows.value[rowIndex] = value
  }

  /** Ordered (dense rank, ties share a rank) list — position is 1-based. */
  function getRanking(): { playerUuid: string, position: number }[] {
    const entries: { playerUuid: string, position: number }[] = []
    rows.value.forEach((row, rowIndex) => {
      for (const player of row) {
        entries.push({ playerUuid: player.value, position: rowIndex + 1 })
      }
    })
    return entries
  }

  return {
    rows, gridSize, rankRange, isValidFormation, initializeGrid, updateRow, getRanking
  }
}
