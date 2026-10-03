// app\composables\tournaments\rounds\useCommanderRoundLifecycle.ts
// Advance/turn-back for one Commander round, separate from useCommanderRoundSubmitHandlers.ts
// (progressing the tournament, not entering round data). This app mounts one
// CommanderRoundManager.vue per round (see [tournamentId]/index.vue's #round-${i} slot), unlike
// league's single round view driven by a page-level useTournamentLifecycle.ts, so advance/turn-back
// stays scoped to this component's instance.
import type { TablePlayer } from '~/types'
import type { CommanderRoundData } from './useCommanderRoundData'

export function useCommanderRoundLifecycle(options: {
  tournamentUuid: MaybeRefOrGetter<string>
  roundNumber: number
  roundData: CommanderRoundData
  autoOpenAdvancePreview: MaybeRefOrGetter<boolean>
  // Two named callbacks rather than Vue's generated `emit`: its overloaded type isn't assignable to
  // a plain `(event: 'a' | 'b') => void` union-parameter type, and unifying the overloads for
  // eslint's unified-signatures rule breaks that assignability again
  onTurnedBack: () => void
  onAdvancePreviewAutoOpened: () => void
}) {
  const {
    tournamentUuid, roundNumber, roundData, autoOpenAdvancePreview,
    onTurnedBack, onAdvancePreviewAutoOpened
  } = options
  const { liveStandings, pairingsForRound, isPairingComplete } = roundData

  const { advanceRound, turnBackRound, reopenTournament: reopenMutation }
    = useTournamentRoundsMutations(tournamentUuid)

  // Seed the next round's optimizer with the live-standings order (best rank first), like league's
  // optimizer but via this app's associate identity. A dropped player isn't seated again; rank
  // counts every player (dropped too), matching the standings table
  const { t } = useI18n()
  const nextRoundSeedPlayers = computed<TablePlayer[]>(() => {
    const labels = {
      victories: t('tournament.single.roundManager.standingsVictoriesHeader'),
      kills: t('tournament.single.roundManager.standingsKillsHeader'),
      brew: t('tournament.single.roundManager.standingsBrewHeader'),
      play: t('tournament.single.roundManager.standingsPlayHeader')
    }
    return liveStandings.value
      .map((standing, index) => ({ standing, rank: index + 1 }))
      .filter(entry => !entry.standing.dropped)
      .map(entry => ({
        value: entry.standing.associateUuid,
        label: entry.standing.label,
        firstName: entry.standing.firstName,
        surname: entry.standing.surname,
        standing: commanderTablePlayerStanding(entry.standing, entry.rank, labels)
      }))
  })

  // After drops, the remaining players must still split into valid tables (3-4 each, never 5).
  const { calculatePods } = useCommanderPods()
  const canFormNextRoundTables = computed(() =>
    calculatePods(nextRoundSeedPlayers.value.length).canPlay)

  const allPairingsComplete = computed(() =>
    pairingsForRound.value.length > 0
    && pairingsForRound.value.every(p => isPairingComplete(p.uuid)))

  const {
    advancePreviewOpen, openAdvancePreview, onAdvanceConfirm, turnBackConfirmOpen, endConfirmOpen,
    requestTurnBack, requestEndTournament, endTournament, onTurnBack, reopenTournament
  } = useRoundAdvanceFlow({
    roundNumber,
    advance: advanceRound,
    turnBack: turnBackRound,
    reopen: reopenMutation,
    autoOpenAdvancePreview,
    onTurnedBack,
    onAdvancePreviewAutoOpened
  })

  return {
    advanceRound,
    turnBackRound,
    reopenMutation,
    advancePreviewOpen,
    nextRoundSeedPlayers,
    allPairingsComplete,
    canFormNextRoundTables,
    openAdvancePreview,
    onAdvanceConfirm,
    turnBackConfirmOpen,
    endConfirmOpen,
    requestTurnBack,
    requestEndTournament,
    endTournament,
    onTurnBack,
    reopenTournament
  }
}
