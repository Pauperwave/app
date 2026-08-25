// app\composables\tournaments\useSwissRoundCount.ts
// Swiss round-count rule for tournament.stepper's round steps — reverse-
// engineered from the legacy Pauperwave Manager's official rule
// (.scratch/2026-08-22-pauperwave-manager-functional-spec.md §4.1), same
// "pure function wrapped in use*()" shape as its siblings useDraftPods.ts/
// useCommanderPods.ts in this directory (user request, 2026-08-24).
export function useSwissRoundCount() {
  // manualOverride wins outright when set — mirrors tournament.roundCount,
  // an existing organizer-editable field (SchedulingFields.vue) that already
  // covers the spec's "Numero Turni Svizzera: Auto / fixed" setting, so no
  // new override UI is needed here.
  function calculateRoundCount(registeredPlayers: number, manualOverride?: number | null): number {
    if (manualOverride !== null && manualOverride !== undefined) return manualOverride
    if (registeredPlayers <= 8) return 3
    if (registeredPlayers <= 16) return 4
    if (registeredPlayers <= 32) return 5
    if (registeredPlayers <= 64) return 6
    return 7
  }

  return { calculateRoundCount }
}
