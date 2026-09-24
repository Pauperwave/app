// app\composables\tournaments\rounds\useCommanderRoundData.ts
// The shared substrate every other CommanderRoundManager.vue composable
// (useCommanderRoundModals/useCommanderRoundSubmitHandlers/
// useCommanderRoundLifecycle) and the template itself reads from: the raw
// per-round queries plus every derived lookup over them (labelFor,
// positionsFor, isPairingComplete, ...). League's own PairingsCard.vue never
// needed an equivalent — its Pinia stores already served as this same
// reactive substrate. Extracted 2026-09-18 once CommanderRoundManager.vue
// had grown past 790 lines mixing this substrate with 5 unrelated modal
// flows and the round lifecycle.
import type { WinnerChecklistEntry } from '~/components/tournaments/single/pairing/WinnerChecklistCard.vue'

export function useCommanderRoundData(options: {
  tournamentUuid: MaybeRefOrGetter<string>
  roundNumber: number
  roundCount: number
}) {
  const { tournamentUuid, roundNumber, roundCount } = options
  const { t } = useI18n()

  const { data: rounds } = useTournamentRoundsQuery(tournamentUuid)
  const { data: pairings } = useTournamentPairingsQuery(tournamentUuid)
  const { data: results } = useTournamentRoundResultsQuery(tournamentUuid)
  const { data: kills } = useTournamentKillsQuery(tournamentUuid)
  const { data: votes } = useTournamentVotesQuery(tournamentUuid)
  const { data: registrations } = useTournamentRegistrationsQuery(tournamentUuid)
  const { data: associatesData } = useAssociatesQuery()
  const { liveStandings } = useLiveCommanderStandings(tournamentUuid)
  // Live-updates results/kills/votes/pairings as the Telegram bot writes to
  // a pod, so an organizer watching this round sees a player's own
  // commander/position/kills/votes without refreshing the page (2026-09-24
  // bug report).
  useCommanderRoundResultsRealtime(tournamentUuid)

  const {
    round, isLastRoundOfTournament, pairingsForRound,
    associateUuidFor, labelFor, namePartsFor, tablePlayersFor
  } = useRoundAndPlayerLookup({
    rounds, pairings, registrations, associatesData, roundNumber, roundCount
  })

  // Turning back round 1 doesn't return to a "previous round" (there isn't
  // one) — turn_back_commander_round resets the tournament to
  // registration_open instead, so the button needs its own label reflecting
  // that different outcome.
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
  // Boolean "done" predicates for RoundStatusCard.vue ("Stato inserimento")
  // — same completion signals the table cards themselves already surface
  // (positionsFor/killsFor/commanderDeckFor/votesFor above), so the sidebar
  // summary and the cards can never disagree on what "done" means.
  function hasRankingFor(pairingUuid: string): boolean {
    return positionsFor(pairingUuid).size > 0
  }
  function hasKillsFor(pairingUuid: string): boolean {
    return killsFor(pairingUuid).length > 0
  }
  function hasCommanderFor(pairingUuid: string, playerUuid: string): boolean {
    return !!commanderDeckFor(pairingUuid, playerUuid)
  }
  function hasVotesFor(pairingUuid: string, playerUuid: string): boolean {
    return votesFor(pairingUuid).some(v => v.voterUuid === playerUuid)
  }

  // One entry per table that already has a real winner (position === 1,
  // draws excluded — a draw has no actual winner, same distinction
  // useCommanderScoring.ts's isDrawTable makes for scoring).
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
    hasKillsFor,
    hasCommanderFor,
    hasVotesFor,
    winners
  }
}

export type CommanderRoundData = ReturnType<typeof useCommanderRoundData>
