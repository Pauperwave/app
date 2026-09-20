// app\composables\tournaments\pairing\useSwissRoundCount.ts
// Swiss round-count rule for tournament.stepper's round steps — the
// official minimum-rounds-by-player-count table (user-provided, 2026-08-31,
// extending the 4-64 range this file already had, reverse-engineered from
// the legacy Pauperwave Manager's own rule at
// .scratch/2026-08-22-pauperwave-manager-functional-spec.md §4.1), same
// "pure function wrapped in use*()" shape as its siblings useDraftPods.ts/
// useCommanderPods.ts in this directory (user request, 2026-08-24). The table
// lives in /settings; DEFAULT_SWISS_ROUND_COUNT_RULES is used until it loads.
import type { SwissRoundCountTier } from '#shared/types/settings'

export interface SwissRoundCountRules {
  tiers: SwissRoundCountTier[]
  beyond: number
}

export const DEFAULT_SWISS_ROUND_COUNT_RULES: SwissRoundCountRules = {
  tiers: [
    { maxPlayers: 8, rounds: 3 },
    { maxPlayers: 16, rounds: 4 },
    { maxPlayers: 32, rounds: 5 },
    { maxPlayers: 64, rounds: 6 },
    { maxPlayers: 128, rounds: 7 },
    { maxPlayers: 226, rounds: 8 },
    { maxPlayers: 409, rounds: 9 }
  ],
  beyond: 10
}

export function useSwissRoundCount() {
  // manualOverride wins outright when set — mirrors tournament.roundCount,
  // an existing organizer-editable field (SchedulingFields.vue) that already
  // covers the spec's "Numero Turni Svizzera: Auto / fixed" setting, so no
  // new override UI is needed here.
  function calculateRoundCount(
    registeredPlayers: number,
    manualOverride?: number | null,
    rules: SwissRoundCountRules = DEFAULT_SWISS_ROUND_COUNT_RULES
  ): number {
    if (manualOverride !== null && manualOverride !== undefined) return manualOverride

    const tier = [...rules.tiers]
      .sort((a, b) => a.maxPlayers - b.maxPlayers)
      .find(candidate => registeredPlayers <= candidate.maxPlayers)
    return tier?.rounds ?? rules.beyond
  }

  return { calculateRoundCount }
}
