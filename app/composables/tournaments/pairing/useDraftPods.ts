// app\composables\tournaments\pairing\useDraftPods.ts
// Table/pod-size distribution for the Draft format's opening pod stage, like league's
// useTableCalculator.ts (ideal 4 / min 3 for Commander) generalized to ideal 8 / min 6. After the
// draft timer, players move into a separate Swiss-pairing stage (shared with other 1v1 formats),
// not covered here
export interface DraftPodSplit {
  canPlay: boolean
  tableCount: number
  // Player count per table, biggest first — e.g. [8, 7, 7] for 22 players.
  tableSizes: number[]
}

const IDEAL_POD_SIZE = 8
const MIN_POD_SIZE = 6

export function useDraftPods() {
  // A single table needn't hit the 6-player minimum (no second table to balance), so any count up
  // to the ideal plays as one pod. Past that, the fewest tables keeping every size in
  // [MIN_POD_SIZE, IDEAL_POD_SIZE]: `tableCount` >= playerCount/IDEAL_POD_SIZE (rounded up) and <=
  // playerCount/MIN_POD_SIZE (rounded down); if the smallest satisfying the first bound violates
  // the second, no valid split exists (e.g. 9, 10, 11, 17 players)
  function calculatePods(playerCount: number): DraftPodSplit {
    if (playerCount <= 0) return { canPlay: false, tableCount: 0, tableSizes: [] }
    if (playerCount <= IDEAL_POD_SIZE) {
      return { canPlay: true, tableCount: 1, tableSizes: [playerCount] }
    }

    const tableCount = Math.ceil(playerCount / IDEAL_POD_SIZE)
    if (tableCount > Math.floor(playerCount / MIN_POD_SIZE)) {
      return { canPlay: false, tableCount: 0, tableSizes: [] }
    }

    // Evenly split, then the remainder one extra player per table (capped at IDEAL_POD_SIZE: the
    // bound above guarantees base + 1 <= it)
    const base = Math.floor(playerCount / tableCount)
    const remainder = playerCount % tableCount
    const tableSizes = [
      ...Array.from({ length: remainder }, () => base + 1),
      ...Array.from({ length: tableCount - remainder }, () => base)
    ]

    return { canPlay: true, tableCount, tableSizes }
  }

  function buildPreviewPods(playerIds: string[]): string[][] {
    return buildPodsFromSizes(playerIds, calculatePods(playerIds.length).tableSizes)
  }

  return { calculatePods, buildPreviewPods }
}
