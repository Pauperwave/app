// app\composables\tournaments\rounds\useCommanderRoundLifecycle.ts
// Advance/turn-back for one Commander round — kept separate from
// useCommanderRoundSubmitHandlers.ts because it's a different kind of
// concern (progressing the tournament itself, not entering data for the
// current round) and has no equivalent split in league's own
// PairingsCard.vue: league had a single shared round view driven by
// useTournamentLifecycle.ts at the page level, while this app mounts one
// CommanderRoundManager.vue instance per round (see
// [tournamentId]/index.vue's own #round-${i} slot), so advance/turn-back
// necessarily stays scoped to this component's own instance instead.
import type { TablePlayer } from '~/types'
import type { CommanderRoundData } from './useCommanderRoundData'

export function useCommanderRoundLifecycle(options: {
  tournamentUuid: MaybeRefOrGetter<string>
  roundNumber: number
  roundData: CommanderRoundData
  autoOpenAdvancePreview: MaybeRefOrGetter<boolean>
  // Two named callbacks rather than passing Vue's own generated `emit`
  // straight through — its overloaded type (one call signature per event
  // name) isn't structurally assignable to a plain `(event: 'a' | 'b') =>
  // void` union-parameter type, and unifying the overloads to satisfy
  // eslint's own unified-signatures rule breaks that assignability again.
  onTurnedBack: () => void
  onAdvancePreviewAutoOpened: () => void
}) {
  const {
    tournamentUuid, roundNumber, roundData, autoOpenAdvancePreview,
    onTurnedBack, onAdvancePreviewAutoOpened
  } = options
  const { liveStandings, pairingsForRound, isPairingComplete } = roundData

  const { advanceRound, turnBackRound } = useTournamentRoundsMutations(tournamentUuid)

  // Seed the next round's optimizer with the current live-standings order
  // (best rank first) — same "rank drives the seed order" idea as league's
  // own pairing optimizer, just resolved through this app's associate
  // identity instead of a numeric rank field.
  const nextRoundSeedPlayers = computed<TablePlayer[]>(() =>
    liveStandings.value.map(s => ({ value: s.associateUuid, label: s.label })))

  const allPairingsComplete = computed(() =>
    pairingsForRound.value.length > 0
    && pairingsForRound.value.every(p => isPairingComplete(p.uuid)))

  const {
    advancePreviewOpen, openAdvancePreview, onAdvanceConfirm, endTournament, onTurnBack
  } = useRoundAdvanceFlow({
    roundNumber,
    advance: advanceRound,
    turnBack: turnBackRound,
    autoOpenAdvancePreview,
    onTurnedBack,
    onAdvancePreviewAutoOpened
  })

  return {
    advanceRound,
    advancePreviewOpen,
    nextRoundSeedPlayers,
    allPairingsComplete,
    openAdvancePreview,
    onAdvanceConfirm,
    endTournament,
    onTurnBack
  }
}
