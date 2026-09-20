// app\composables\tournaments\pairing\useSwissPairing.ts
// 1v1 table pairing for Swiss-format tournaments (Draft after its pod stage,
// Pauper/Premodern/Oldschool/Sealed/Cubo Vintage) — see
// docs/plans/2026-09-15-swiss-pairing-draft-1v1-plan.md. This is the round-1
// starting point (sequential slice, organizer reorders by hand before
// confirming) plus the playable-count check; the standings-based pairing of the
// later rounds is swissPairing.ts.
export interface SwissPairingSplit {
  canPlay: boolean
  /** Tables of 2 players; with an odd count one more player sits out on a bye. */
  tableCount: number
  hasBye: boolean
}

export function useSwissPairing() {
  function calculatePairing(playerCount: number): SwissPairingSplit {
    if (playerCount < 2) return { canPlay: false, tableCount: 0, hasBye: false }

    return {
      canPlay: true,
      tableCount: Math.floor(playerCount / 2),
      hasBye: playerCount % 2 === 1
    }
  }

  function buildPreviewPairs(playerIds: string[]): string[][] {
    const pairs: string[][] = []
    for (let i = 0; i < playerIds.length; i += 2) {
      pairs.push(playerIds.slice(i, i + 2))
    }
    return pairs
  }

  return { calculatePairing, buildPreviewPairs }
}
