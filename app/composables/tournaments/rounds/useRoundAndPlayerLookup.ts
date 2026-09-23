// app\composables\tournaments\rounds\useRoundAndPlayerLookup.ts
// Shared substrate for both round-manager views (CommanderRoundManager.vue's
// own useCommanderRoundData.ts, and SwissRoundManager.vue) — which round is
// current, which pairings belong to it, and the player_uuid -> associate
// uuid/display-label lookup every table/card needs. Extracted 2026-09-23
// (fallow:dupes) once both had independently grown the exact same block.
import type { Associate, TablePlayer } from '~/types'
import type { TournamentRound } from '~/composables/tournaments/rounds/useTournamentRoundsQuery'
import type { TournamentPairing } from '~/composables/tournaments/pairing/useTournamentPairingsQuery'
import type { TournamentRegistration } from '~/composables/tournaments/registration/useTournamentRegistrationsQuery'

export function useRoundAndPlayerLookup(options: {
  rounds: Ref<TournamentRound[] | undefined>
  pairings: Ref<TournamentPairing[] | undefined>
  registrations: Ref<TournamentRegistration[] | undefined>
  associatesData: Ref<Associate[] | undefined>
  roundNumber: number
  roundCount: number
}) {
  const {
    rounds, pairings, registrations, associatesData, roundNumber, roundCount
  } = options

  const round = computed(() => rounds.value?.find(r => r.roundNumber === roundNumber) ?? null)
  const isLastRoundOfTournament = computed(() => roundNumber >= roundCount)

  const pairingsForRound = computed(() =>
    (pairings.value ?? []).filter(p => p.roundUuid === round.value?.uuid))

  // player_uuid -> associate uuid / display label, resolved through this
  // tournament's own registrations (not a global players table read) — same
  // mapping every other tournament-detail composable already gets.
  const associateByPlayerUuid = computed(() => {
    const map = new Map<string, string>()
    for (const registration of registrations.value ?? []) {
      map.set(registration.playerUuid, registration.associateUuid)
    }
    return map
  })
  const associatesByUuid = computed(() =>
    new Map((associatesData.value ?? []).map(a => [a.uuid, a])))

  function labelFor(playerUuid: string): string {
    const associateUuid = associateByPlayerUuid.value.get(playerUuid)
    const associate = associateUuid ? associatesByUuid.value.get(associateUuid) : undefined
    return associate ? `${associate.first_name} ${associate.last_name}` : playerUuid
  }
  function associateUuidFor(playerUuid: string): string | undefined {
    return associateByPlayerUuid.value.get(playerUuid)
  }
  function tablePlayersFor(pairing: { playerUuids: string[] }): TablePlayer[] {
    return pairing.playerUuids.map(playerUuid => ({
      value: playerUuid, label: labelFor(playerUuid)
    }))
  }

  return {
    round,
    isLastRoundOfTournament,
    pairingsForRound,
    associateByPlayerUuid,
    associatesByUuid,
    labelFor,
    associateUuidFor,
    tablePlayersFor
  }
}
