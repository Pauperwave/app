// app\composables\tournaments\rounds\useSwissRoundLifecycle.ts
// Advance/turn-back for one Swiss round — kept separate from
// useSwissRoundSubmitHandlers.ts because it's a different kind of concern
// (progressing the tournament itself, not entering data for the current
// round). Same split, same reasoning, as
// CommanderRoundManager.vue's own useCommanderRoundLifecycle.ts
// (2026-09-24) — SwissRoundManager.vue mounts one instance per round (see
// index.vue's own #round-${i} slot), so advance/turn-back necessarily stays
// scoped to this component's own instance instead of a page-level store.
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

  const { advanceRoundSwiss, turnBackRoundSwiss }
    = useTournamentSwissRoundsMutations(tournamentUuid)

  // The next round's pairing order: the active players (a dropped one isn't
  // paired again) ranked by the live standings, skipping rematches; with an
  // odd count the lowest-ranked player without a bye yet gets it. Unlike
  // matchPlayersFor (used for on-screen display, keyed by players.uuid same
  // as Commander's own pairing cards), SwissTablePreviewModal's confirm
  // hands this straight to advance_swiss_round's p_associate_order, which
  // resolves against players.associate_uuid — value here MUST be the
  // associate uuid, not the player uuid, or the RPC can't resolve anyone
  // (confirmed live: "Could not resolve every associate to a registered
  // player of this tournament").
  const nextRoundSeedPlayers = computed<TablePlayer[]>(() => {
    const rankedPlayerUuids = liveStandings.value
      .filter(standing => !standing.dropped)
      .map(standing => standing.playerUuid)
    const orderedPlayerUuids = pairSwissRound(
      rankedPlayerUuids, playedPairs.value, byePlayerUuids.value
    )
    return orderedPlayerUuids.flatMap((playerUuid) => {
      const associateUuid = associateUuidFor(playerUuid)
      return associateUuid ? [{ value: associateUuid, label: labelFor(playerUuid) }] : []
    })
  })

  // The next round is paired from the standings, so every table needs its
  // result first (a bye has none to enter).
  const allResultsEntered = computed(() =>
    pairingsForRound.value.length > 0
    && pairingsForRound.value.every(pairing =>
      pairing.playerUuids.length === 1 || matchResultByPairingUuid.value.has(pairing.uuid)))

  const {
    advancePreviewOpen, openAdvancePreview, onAdvanceConfirm, endTournament, onTurnBack
  } = useRoundAdvanceFlow({
    roundNumber,
    advance: advanceRoundSwiss,
    turnBack: turnBackRoundSwiss,
    autoOpenAdvancePreview,
    onTurnedBack,
    onAdvancePreviewAutoOpened
  })

  return {
    advanceRoundSwiss,
    advancePreviewOpen,
    nextRoundSeedPlayers,
    allResultsEntered,
    openAdvancePreview,
    onAdvanceConfirm,
    endTournament,
    onTurnBack
  }
}
