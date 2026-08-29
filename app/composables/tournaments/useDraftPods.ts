// app\composables\tournaments\useDraftPods.ts
// Table/pod-size distribution for the Draft format's opening pod stage (user
// request, 2026-08-24) — same shape as MagicTheGathering/league's
// useTableCalculator.ts (ideal 4 / min 3 for Commander pods), generalized to
// ideal 8 / min 6. After a pod's draft timer ends, players move into a
// separate Swiss-pairing stage (shared with Pauper/Premodern/other 1v1
// formats) — not part of this composable, which only covers the pod split.
export interface DraftPodSplit {
  canPlay: boolean
  tableCount: number
  // Player count per table, biggest first — e.g. [8, 7, 7] for 22 players.
  tableSizes: number[]
}

const IDEAL_POD_SIZE = 8
const MIN_POD_SIZE = 6

export function useDraftPods() {
  // A single table never has to hit the 6-player minimum — there's no second
  // table to balance against, so any count up to the ideal size plays as one
  // pod. Past that, the number of tables is the fewest that keeps every
  // table's size in [MIN_POD_SIZE, IDEAL_POD_SIZE]: `tableCount` must be at
  // least playerCount/IDEAL_POD_SIZE (rounded up, so no table exceeds the
  // ideal) and at most playerCount/MIN_POD_SIZE (rounded down, so no table
  // falls short of the minimum) — if the smallest tableCount satisfying the
  // first bound already violates the second, no valid split exists (e.g. 9,
  // 10, 11, 17 players).
  function calculatePods(playerCount: number): DraftPodSplit {
    if (playerCount <= 0) return { canPlay: false, tableCount: 0, tableSizes: [] }
    if (playerCount <= IDEAL_POD_SIZE) {
      return { canPlay: true, tableCount: 1, tableSizes: [playerCount] }
    }

    const tableCount = Math.ceil(playerCount / IDEAL_POD_SIZE)
    if (tableCount > Math.floor(playerCount / MIN_POD_SIZE)) {
      return { canPlay: false, tableCount: 0, tableSizes: [] }
    }

    // Evenly split, then hand the remainder out as one extra player per
    // table (capped at IDEAL_POD_SIZE by construction, since the bound above
    // already guarantees base + 1 <= IDEAL_POD_SIZE).
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
