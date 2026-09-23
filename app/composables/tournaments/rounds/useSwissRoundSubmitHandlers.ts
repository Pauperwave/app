// app\composables\tournaments\rounds\useSwissRoundSubmitHandlers.ts
// Entering data for the current Swiss round: a table's score, a player's
// drop. Kept separate from useSwissRoundLifecycle.ts because it's a
// different kind of concern (data entry, not progressing the tournament
// itself) — same split as CommanderRoundManager.vue's own
// useCommanderRoundSubmitHandlers.ts/useCommanderRoundLifecycle.ts pair
// (2026-09-24).
import type { MatchScore } from '~/types'
import type { SwissRoundData } from './useSwissRoundData'

export function useSwissRoundSubmitHandlers(options: {
  tournamentUuid: MaybeRefOrGetter<string>
  roundData: SwissRoundData
}) {
  const { tournamentUuid, roundData } = options
  const { pairingsForRound, round, dropByPlayerUuid } = roundData

  const { saveMatchResult, deleteMatchResult } = useTournamentMatchResultsMutations(tournamentUuid)

  async function onScoreSelect(pairingUuid: string, score: MatchScore) {
    const pairing = pairingsForRound.value.find(p => p.uuid === pairingUuid)
    const [player1Uuid, player2Uuid] = pairing?.playerUuids ?? []
    if (!player1Uuid || !player2Uuid) return

    try {
      await saveMatchResult.mutateAsync({
        pairingUuid, player1Uuid, player2Uuid, ...score
      })
    } catch { /* toasted by the mutation's own onError */ }
  }

  function onScoreClear(pairingUuid: string) {
    deleteMatchResult.mutate(pairingUuid)
  }

  const { setDropped } = useTournamentDropsMutations(tournamentUuid)

  // A drop only takes effect from the next round: this round's match still counts.
  function onToggleDrop(playerUuid: string) {
    const roundUuid = round.value?.uuid
    if (!roundUuid) return

    setDropped.mutate({
      playerUuid,
      roundUuid,
      dropped: !dropByPlayerUuid.value.has(playerUuid)
    })
  }

  return {
    saveMatchResult, deleteMatchResult, onScoreSelect, onScoreClear, setDropped, onToggleDrop
  }
}
