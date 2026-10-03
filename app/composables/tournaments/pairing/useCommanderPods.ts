// app\composables\tournaments\pairing\useCommanderPods.ts
// Table/pod-size distribution for Commander (ideal 4 players/table, minimum 3), ported from
// league's useTableCalculator.ts, with the same { canPlay, tableCount, tableSizes } shape as
// useDraftPods.ts's ideal-8/min-6 split. Unlike Draft there is no "N <= ideal plays as one table"
// shortcut: with a 1-player gap between minimum and ideal the modular formula below already
// resolves N=3/N=4 to one table
export interface CommanderPodSplit {
  canPlay: boolean
  tableCount: number
  // Player count per table, biggest first — e.g. [4, 4, 3] for 11 players.
  tableSizes: number[]
}

const IDEAL_POD_SIZE = 4
const MIN_POD_SIZE = 3

export function useCommanderPods() {
  // The league trick of "borrowing players into MIN_POD_SIZE tables to absorb the remainder":
  // `playerCount % IDEAL_POD_SIZE` is the leftover after filling ideal tables; `(IDEAL_POD_SIZE -
  // leftover) % IDEAL_POD_SIZE` is how many MIN_POD_SIZE tables make the total divide evenly. 5 has
  // no valid 3/4 combination, hence the explicit guard
  function calculatePods(playerCount: number): CommanderPodSplit {
    if (playerCount < MIN_POD_SIZE || playerCount === 5) {
      return { canPlay: false, tableCount: 0, tableSizes: [] }
    }

    const smallTables = (IDEAL_POD_SIZE - (playerCount % IDEAL_POD_SIZE)) % IDEAL_POD_SIZE
    const idealTables = (playerCount - smallTables * MIN_POD_SIZE) / IDEAL_POD_SIZE

    const tableSizes = [
      ...Array.from({ length: idealTables }, () => IDEAL_POD_SIZE),
      ...Array.from({ length: smallTables }, () => MIN_POD_SIZE)
    ]

    return { canPlay: true, tableCount: tableSizes.length, tableSizes }
  }

  function buildPreviewPods(playerIds: string[]): string[][] {
    return buildPodsFromSizes(playerIds, calculatePods(playerIds.length).tableSizes)
  }

  return { calculatePods, buildPreviewPods }
}
