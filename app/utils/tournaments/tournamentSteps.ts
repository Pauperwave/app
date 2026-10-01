// app\utils\tournaments\tournamentSteps.ts
// Which stepper steps of a tournament are reachable: only the ones it has
// already gotten to (its real current step and the ones before it), never the
// ones ahead — otherwise an organizer could open, say, the prizes step of a
// tournament that is still taking registrations. The steps ahead stay visible,
// just not openable; the tournament only gets to them through its own buttons.

// The steps up to and including the tournament's real current one; a completed
// tournament has been through all of them (awards, prizes, leaderboard).
// `canOpenAny` lifts the restriction (development, or the developer view): every
// step is then reachable, as a testing aid.
export function reachedStepSlots(
  allSlots: string[],
  currentSlot: string | null,
  isCompleted: boolean,
  canOpenAny = false
): string[] {
  if (isCompleted || canOpenAny) return allSlots

  const index = currentSlot ? allSlots.indexOf(currentSlot) : -1
  return allSlots.slice(0, Math.max(index, 0) + 1)
}

// A step picked by hand (a click, or a `?step=` link) only counts if it has been
// reached; anything ahead falls back to the tournament's real current step.
export function resolveActiveStepSlot(
  manualSlot: string | null,
  reachedSlots: string[],
  currentSlot: string | null
): string | null {
  return manualSlot && reachedSlots.includes(manualSlot) ? manualSlot : currentSlot
}

export type StepProgress
  = | 'draft'
    | 'registrationOpen'
    | 'registrationClosed'
    | 'pending'
    | 'inProgress'
    | 'completed'
    | 'available'
    | 'availablePlural'
    | 'availableAtEnd'
    | 'prizesSuggestion'

interface StepProgressContext {
  tournamentStatus: string | null
  /** Status of each round that exists, by its 1-based number. */
  roundStatusByNumber: Map<number, string>
}

// The short line under each step's title, from what the tournament has actually done so far.
export function stepProgress(slot: string, context: StepProgressContext): StepProgress {
  const isCompleted = context.tournamentStatus === 'completed'

  if (slot === 'acceptance') {
    if (context.tournamentStatus === 'draft') return 'draft'
    return context.tournamentStatus === 'registration_open' ? 'registrationOpen' : 'registrationClosed'
  }

  if (slot.startsWith('round-')) {
    const roundStatus = context.roundStatusByNumber.get(Number(slot.slice('round-'.length)))
    if (roundStatus === 'completed') return 'completed'
    return roundStatus === 'in_progress' ? 'inProgress' : 'pending'
  }

  if (slot === 'awards') return isCompleted ? 'availablePlural' : 'pending'
  if (slot === 'leaderboard') return isCompleted ? 'available' : 'availableAtEnd'
  return 'prizesSuggestion'
}
