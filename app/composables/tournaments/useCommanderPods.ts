// app\composables\tournaments\useCommanderPods.ts
// Table/pod-size distribution for Commander (ideal 4 players/table, minimum
// 3) — ported from MagicTheGathering/league's useTableCalculator.ts, same
// { canPlay, tableCount, tableSizes } shape as useDraftPods.ts's ideal-8/
// min-6 split for consistency between the two (user request, 2026-08-24:
// "copia anche il composable per commander" while porting the Draft one).
// Unlike Draft, there's no "N <= ideal plays as one table" shortcut — with
// only a 1-player gap between minimum and ideal, the modular formula below
// already resolves N=3/N=4 to a single table on its own; adding a shortcut
// here would be redundant, not simplifying.
export interface CommanderPodSplit {
  canPlay: boolean
  tableCount: number
  // Player count per table, biggest first — e.g. [4, 4, 3] for 11 players.
  tableSizes: number[]
}

const IDEAL_POD_SIZE = 4
const MIN_POD_SIZE = 3

export function useCommanderPods() {
  // Same "borrow players into MIN_POD_SIZE tables to absorb the remainder"
  // trick as league: `playerCount % IDEAL_POD_SIZE` is the leftover after
  // filling as many ideal-size tables as possible; `(IDEAL_POD_SIZE -
  // leftover) % IDEAL_POD_SIZE` converts that into how many MIN_POD_SIZE
  // tables are needed to make the remaining total divide evenly again. 5 is
  // the one count with no valid 3/4 combination (2 tables of 3 is 6, not 5;
  // one table of 4 leaves 1 short) — same explicit guard as league.
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

  // Slices an ordered (e.g. pre-shuffled/seeded) list of player ids into
  // pods of the sizes calculatePods() decided on.
  function buildPreviewPods(playerIds: string[]): string[][] {
    const { tableSizes } = calculatePods(playerIds.length)
    if (!tableSizes.length) return []

    const pods: string[][] = []
    let cursor = 0
    for (const size of tableSizes) {
      pods.push(playerIds.slice(cursor, cursor + size))
      cursor += size
    }
    return pods
  }

  return { calculatePods, buildPreviewPods }
}
