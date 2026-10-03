// app\composables\tournaments\rounds\useRoundStatus.ts
// Derives the 4 round-status lists (rankings/kills per table, commanders/votes per player) backing
// RoundStatusCard.vue's "Stato inserimento" sidebar, ported from league's useRoundStatus.ts but
// reading CommanderRoundManager.vue's per-pairing helpers
// (positionsFor/killsFor/hasCommander/hasVotes) instead of Pinia stores: the same completion
// predicates the table cards use, so they can't disagree on "done"
import type { TournamentPairing } from '../pairing/useTournamentPairingsQuery'

export interface RoundStatusTableItem {
  pairingUuid: string
  tableNumber: number
  done: boolean
  /** Seated players' display names — not rendered, only searched against
   *  (see RoundStatusCard.vue's search bar) so typing a surname surfaces
   *  the table that player is seated at instead of matching nothing. */
  playerNames: string[]
}

export interface RoundStatusPlayerItem {
  pairingUuid: string
  playerUuid: string
  tableNumber: number
  label: string
  done: boolean
}

export function useRoundStatus(
  pairingsForRound: Ref<TournamentPairing[]>,
  labelFor: (playerUuid: string) => string,
  hasRanking: (pairingUuid: string) => boolean,
  hasKills: (pairingUuid: string) => boolean,
  hasCommander: (pairingUuid: string, playerUuid: string) => boolean,
  hasVotes: (pairingUuid: string, playerUuid: string) => boolean
) {
  const rankingItems = computed<RoundStatusTableItem[]>(() =>
    pairingsForRound.value.map((pairing, index) => ({
      pairingUuid: pairing.uuid,
      tableNumber: pairing.tableNumber ?? index + 1,
      done: hasRanking(pairing.uuid),
      playerNames: pairing.playerUuids.map(labelFor)
    })))

  const killItems = computed<RoundStatusTableItem[]>(() =>
    pairingsForRound.value.map((pairing, index) => ({
      pairingUuid: pairing.uuid,
      tableNumber: pairing.tableNumber ?? index + 1,
      done: hasKills(pairing.uuid),
      playerNames: pairing.playerUuids.map(labelFor)
    })))

  function buildPlayerItems(isDone: (pairingUuid: string, playerUuid: string) => boolean):
  RoundStatusPlayerItem[] {
    return pairingsForRound.value.flatMap((pairing, index) =>
      pairing.playerUuids.map(playerUuid => ({
        pairingUuid: pairing.uuid,
        playerUuid,
        tableNumber: pairing.tableNumber ?? index + 1,
        label: labelFor(playerUuid),
        done: isDone(pairing.uuid, playerUuid)
      })))
  }

  const commanderItems = computed(() => buildPlayerItems(hasCommander))
  const voteItems = computed(() => buildPlayerItems(hasVotes))

  return { rankingItems, killItems, commanderItems, voteItems }
}
