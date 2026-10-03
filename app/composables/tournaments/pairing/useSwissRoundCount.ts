// app\composables\tournaments\pairing\useSwissRoundCount.ts
// Swiss round-count rule for the tournament stepper's round steps: the official
// minimum-rounds-by-player-count table (4-64 and beyond, reverse-engineered from the legacy
// Pauperwave Manager's rule), a pure function wrapped in use*() like
// useDraftPods.ts/useCommanderPods.ts. The table lives in /settings;
// DEFAULT_SWISS_ROUND_COUNT_RULES is used until it loads
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
  // manualOverride wins when set: it mirrors the organizer-editable tournament.roundCount
  // (SchedulingFields.vue), which already covers "Numero Turni Svizzera: Auto / fixed"
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
