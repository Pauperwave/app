// app\composables\tournaments\pairing\useSwissPairing.ts
// 1v1 table pairing for Swiss-format tournaments (Draft after its pod stage,
// Pauper/Premodern/Oldschool/Sealed/Cubo Vintage) — Phase 1 of
// docs/plans/2026-09-15-swiss-pairing-draft-1v1-plan.md. Deliberately not a
// port of anything (league has no 1v1 pairing system, see that plan's own
// research note) and deliberately not the real bracket-by-standings Swiss
// algorithm yet — no scoring exists for this format yet either (phase 3).
// This is the same "sequential slice, organizer reorders by hand before
// confirming" starting point useDraftPods.ts/useCommanderPods.ts already
// give their own formats.
export interface SwissPairingSplit {
  canPlay: boolean
  tableCount: number
}

export function useSwissPairing() {
  // Byes (odd player counts) are out of scope for phase 1 — same
  // "unplayable count raises, doesn't half-support" precedent as
  // Commander's own 3-or-5-player exclusion.
  function calculatePairing(playerCount: number): SwissPairingSplit {
    if (playerCount < 2 || playerCount % 2 !== 0)
      return { canPlay: false, tableCount: 0 }

    return { canPlay: true, tableCount: playerCount / 2 }
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
