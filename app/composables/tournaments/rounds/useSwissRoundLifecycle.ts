// app\composables\tournaments\rounds\useSwissRoundLifecycle.ts
// Advance/turn-back for one Swiss round, separate from useSwissRoundSubmitHandlers.ts (same split
// as useCommanderRoundLifecycle.ts): SwissRoundManager.vue mounts one instance per round (see
// index.vue's #round-${i} slot), so advance/turn-back stays scoped to it, not a page-level store
import type { TablePlayer } from '~/types'
import type { SwissRoundData } from './useSwissRoundData'

export function useSwissRoundLifecycle(options: {
  tournamentUuid: MaybeRefOrGetter<string>
  roundNumber: number
  roundData: SwissRoundData
  autoOpenAdvancePreview: MaybeRefOrGetter<boolean>
  // Two named callbacks rather than passing Vue's own generated `emit`
  // straight through — see useCommanderRoundLifecycle.ts's own comment.
  onTurnedBack: () => void
  onAdvancePreviewAutoOpened: () => void
}) {
  const {
    tournamentUuid, roundNumber, roundData, autoOpenAdvancePreview,
    onTurnedBack, onAdvancePreviewAutoOpened
  } = options
  const {
    pairingsForRound, matchResultByPairingUuid, liveStandings, playedPairs, byePlayerUuids,
    associateUuidFor, labelFor
  } = roundData

  const { advanceRoundSwiss, turnBackRoundSwiss, reopenTournamentSwiss }
    = useTournamentSwissRoundsMutations(tournamentUuid)

  // The next round's pairing order: active players (a dropped one isn't paired again) ranked by
  // live standings, skipping rematches; with an odd count the lowest-ranked player without a bye
  // gets it. Unlike matchPlayersFor (display, keyed by players.uuid), SwissTablePreviewModal's
  // confirm hands this to advance_swiss_round's p_associate_order, which resolves against
  // players.associate_uuid: the value MUST be the associate uuid, or the RPC can't resolve anyone
  const nextRoundSeedPlayers = computed<TablePlayer[]>(() => {
    const rankedPlayerUuids = liveStandings.value
      .filter(standing => !standing.dropped)
      .map(standing => standing.playerUuid)
    const orderedPlayerUuids = pairSwissRound(
      rankedPlayerUuids, playedPairs.value, byePlayerUuids.value
    )
    // Rank counts every player (dropped ones too), matching the standings table.
    const rankedStandings = new Map(liveStandings.value
      .map((standing, index) => [standing.playerUuid, { standing, rank: index + 1 }] as const))

    return orderedPlayerUuids.flatMap((playerUuid) => {
      const associateUuid = associateUuidFor(playerUuid)
      if (!associateUuid) return []

      const ranked = rankedStandings.get(playerUuid)
      return [{
        value: associateUuid,
        label: labelFor(playerUuid),
        standing: ranked ? swissTablePlayerStanding(ranked.standing, ranked.rank) : undefined
      }]
    })
  })

  // The next round is paired from the standings, so every table needs its
  // result first (a bye has none to enter).
  const allResultsEntered = computed(() =>
    pairingsForRound.value.length > 0
    && pairingsForRound.value.every(pairing =>
      pairing.playerUuids.length === 1 || matchResultByPairingUuid.value.has(pairing.uuid)))

  const {
    advancePreviewOpen, openAdvancePreview, onAdvanceConfirm, turnBackConfirmOpen, endConfirmOpen,
    requestTurnBack, requestEndTournament, endTournament, onTurnBack, reopenTournament
  } = useRoundAdvanceFlow({
    roundNumber,
    advance: advanceRoundSwiss,
    turnBack: turnBackRoundSwiss,
    reopen: reopenTournamentSwiss,
    autoOpenAdvancePreview,
    onTurnedBack,
    onAdvancePreviewAutoOpened
  })

  return {
    advanceRoundSwiss,
    turnBackRoundSwiss,
    reopenTournamentSwiss,
    advancePreviewOpen,
    nextRoundSeedPlayers,
    allResultsEntered,
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
