// app\composables\tournaments\rounds\useCommanderRoundData.ts
// The shared substrate every other CommanderRoundManager.vue composable
// (useCommanderRoundModals/SubmitHandlers/Lifecycle) and the template read: the raw per-round
// queries plus every derived lookup over them (labelFor, positionsFor, isPairingComplete, ...).
// league's Pinia stores served this role there.
import type { WinnerChecklistEntry } from '~/components/tournaments/single/pairing/WinnerChecklistCard.vue'

export function useCommanderRoundData(options: {
  tournamentUuid: MaybeRefOrGetter<string>
  roundNumber: number
  roundCount: number
}) {
  const { tournamentUuid, roundNumber, roundCount } = options
  const { t } = useI18n()

  // fallow-ignore-next-line code-duplication -- round data queries mirror the sibling composable
  const { data: rounds } = useTournamentRoundsQuery(tournamentUuid)
  const { data: pairings } = useTournamentPairingsQuery(tournamentUuid)
  const { data: results } = useTournamentRoundResultsQuery(tournamentUuid)
  const { data: kills } = useTournamentKillsQuery(tournamentUuid)
  const { data: votes } = useTournamentVotesQuery(tournamentUuid)
  const { data: registrations } = useTournamentRegistrationsQuery(tournamentUuid)
  const { data: associatesData } = useAssociatesQuery()
  const { liveStandings, dropByPlayerUuid } = useLiveCommanderStandings(tournamentUuid)
  // Live-updates results/kills/votes/pairings as the Telegram bot writes to a pod, so an organizer
  // sees a player's input without refreshing
  useCommanderRoundResultsRealtime(tournamentUuid)

  const {
    round, isLastRoundOfTournament, pairingsForRound,
    associateUuidFor, labelFor, namePartsFor, tablePlayersFor
  } = useRoundAndPlayerLookup({
    rounds, pairings, registrations, associatesData, roundNumber, roundCount
  })

  // Turning back round 1 has no "previous round": turn_back_commander_round resets to
  // registration_open, so the button needs its own label
  const isFirstRound = computed(() => roundNumber <= 1)
  const turnBackButtonLabel = computed(() => isFirstRound.value
    ? t('tournament.single.roundManager.turnBackToRegistrationButton')
    : t('tournament.single.roundManager.turnBackButton'))
  const roundIsCompleted = computed(() => round.value?.status === 'completed')
  const tournamentIsEnded = computed(() => isLastRoundOfTournament.value && roundIsCompleted.value)

  function positionsFor(pairingUuid: string): Map<string, number> {
    const map = new Map<string, number>()
    for (const result of results.value ?? []) {
      if (result.pairingUuid === pairingUuid && result.position !== null) {
        map.set(result.playerUuid, result.position)
      }
    }
    return map
  }
  function killsFor(pairingUuid: string) {
    return (kills.value ?? []).filter(k => k.pairingUuid === pairingUuid)
  }
  function votesFor(pairingUuid: string) {
    return (votes.value ?? []).filter(v => v.pairingUuid === pairingUuid)
  }
  function commanderDeckFor(pairingUuid: string, playerUuid: string) {
    const result = (results.value ?? [])
      .find(r => r.pairingUuid === pairingUuid && r.playerUuid === playerUuid)
    return result?.commanderDeckUuid ?? null
  }
  function isPairingComplete(pairingUuid: string): boolean {
    const pairing = pairingsForRound.value.find(p => p.uuid === pairingUuid)
    if (!pairing) return false
    return pairing.playerUuids.every(playerUuid => positionsFor(pairingUuid).has(playerUuid))
  }
  function isPairingDraw(pairingUuid: string): boolean {
    const pos = positionsFor(pairingUuid)
    const pairing = pairingsForRound.value.find(p => p.uuid === pairingUuid)
    if (!pairing || pos.size === 0) return false
    const allFirst = pairing.playerUuids.every(playerUuid => pos.get(playerUuid) === 1)
    const noKills = killsFor(pairingUuid).length === 0
    return allFirst && noKills
  }
  // Boolean "done" predicates for RoundStatusCard.vue ("Stato inserimento"): the same signals the
  // table cards surface, so they can't disagree on "done"
  function hasRankingFor(pairingUuid: string): boolean {
    return positionsFor(pairingUuid).size > 0
  }
  // The organizer's "no kills at this table" confirmation counts as the kills being entered.
  function noKillsFor(pairingUuid: string): boolean {
    return pairingsForRound.value.find(p => p.uuid === pairingUuid)?.noKills ?? false
  }
  function hasKillsFor(pairingUuid: string): boolean {
    return killsFor(pairingUuid).length > 0 || noKillsFor(pairingUuid)
  }
  function hasCommanderFor(pairingUuid: string, playerUuid: string): boolean {
    return !!commanderDeckFor(pairingUuid, playerUuid)
  }
  function hasVotesFor(pairingUuid: string, playerUuid: string): boolean {
    return votesFor(pairingUuid).some(v => v.voterUuid === playerUuid)
  }

  // One entry per table with a real winner (position === 1, draws excluded: a draw has no winner,
  // like useCommanderScoring.ts's isDrawTable)
  const winners = computed<WinnerChecklistEntry[]>(() =>
    pairingsForRound.value.reduce<WinnerChecklistEntry[]>((entries, pairing) => {
      if (isPairingDraw(pairing.uuid)) return entries
      const pos = positionsFor(pairing.uuid)
      const winnerUuids = pairing.playerUuids.filter(playerUuid => pos.get(playerUuid) === 1)
      if (winnerUuids.length === 0) return entries
      entries.push({
        pairingUuid: pairing.uuid,
        tableNumber: pairing.tableNumber ?? 0,
        players: winnerUuids.map(playerUuid => ({ value: playerUuid, label: labelFor(playerUuid) }))
      })
      return entries
    }, []))

  return {
    round,
    isLastRoundOfTournament,
    isFirstRound,
    turnBackButtonLabel,
    roundIsCompleted,
    tournamentIsEnded,
    results,
    liveStandings,
    dropByPlayerUuid,
    labelFor,
    namePartsFor,
    associateUuidFor,
    pairingsForRound,
    tablePlayersFor,
    positionsFor,
    killsFor,
    votesFor,
    commanderDeckFor,
    isPairingComplete,
    isPairingDraw,
    hasRankingFor,
    noKillsFor,
    hasKillsFor,
    hasCommanderFor,
    hasVotesFor,
    winners
  }
}

export type CommanderRoundData = ReturnType<typeof useCommanderRoundData>
