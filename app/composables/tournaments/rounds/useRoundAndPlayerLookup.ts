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

  function associateFor(playerUuid: string): Associate | undefined {
    const associateUuid = associateByPlayerUuid.value.get(playerUuid)
    return associateUuid ? associatesByUuid.value.get(associateUuid) : undefined
  }
  function labelFor(playerUuid: string): string {
    const associate = associateFor(playerUuid)
    return associate ? `${associate.first_name} ${associate.last_name}` : playerUuid
  }
  // The real first-name/surname pair (not a guessed split of labelFor's
  // joined string) — see TablePlayer.firstName/surname's own comment.
  function namePartsFor(playerUuid: string): { firstName: string, surname: string } {
    const associate = associateFor(playerUuid)
    return associate
      ? { firstName: associate.first_name, surname: associate.last_name }
      : { firstName: playerUuid, surname: '' }
  }
  function associateUuidFor(playerUuid: string): string | undefined {
    return associateByPlayerUuid.value.get(playerUuid)
  }
  function tablePlayersFor(pairing: { playerUuids: string[] }): TablePlayer[] {
    return pairing.playerUuids.map((playerUuid) => {
      const { firstName, surname } = namePartsFor(playerUuid)
      return { value: playerUuid, label: labelFor(playerUuid), firstName, surname }
    })
  }

  return {
    round,
    isLastRoundOfTournament,
    pairingsForRound,
    associateByPlayerUuid,
    associatesByUuid,
    labelFor,
    namePartsFor,
    associateUuidFor,
    tablePlayersFor
  }
}
