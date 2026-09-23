// app\composables\tournaments\rounds\useSwissRoundData.ts
// The shared substrate SwissRoundManager.vue's own submit-handlers and
// lifecycle composables (and the template itself) read from: the raw
// per-round queries plus every derived lookup over them (personFor,
// matchPlayersFor, confirmedInfoFor, pendingPlayerUuids, ...). Same split as
// CommanderRoundManager.vue's own useCommanderRoundData.ts (2026-09-24,
// once SwissRoundManager.vue had grown to mix all of this with the submit
// handlers and the advance/turn-back lifecycle in one 367-line file).
import type { SwissMatchConfirmedInfo, SwissMatchPerson, SwissMatchPlayer } from '~/types'
import type { TournamentMatchResult } from './useTournamentMatchResultsQuery'

export function useSwissRoundData(options: {
  tournamentUuid: MaybeRefOrGetter<string>
  roundNumber: number
  roundCount: number
}) {
  const { tournamentUuid, roundNumber, roundCount } = options

  const { data: rounds } = useTournamentRoundsQuery(tournamentUuid)
  const { data: pairings } = useTournamentPairingsQuery(tournamentUuid)
  const { data: matchResults } = useTournamentMatchResultsQuery(tournamentUuid)
  const { data: matchReports } = useTournamentMatchReportsQuery(tournamentUuid)
  const { data: registrations } = useTournamentRegistrationsQuery(tournamentUuid)
  // Live-updates matchResults/matchReports/pairings as the Telegram bot
  // writes to them, so an organizer watching this round sees a player's
  // submitted result — and the opponent's confirmation — without refreshing
  // the page (2026-09-23 user request).
  useTournamentMatchResultsRealtime(tournamentUuid)
  const {
    liveStandings, playedPairs, byePlayerUuids, dropByPlayerUuid
  } = useLiveSwissStandings(tournamentUuid)
  const { data: associatesData } = useAssociatesQuery()

  const {
    round, isLastRoundOfTournament, pairingsForRound,
    associatesByUuid, labelFor, associateUuidFor
  } = useRoundAndPlayerLookup({
    rounds, pairings, registrations, associatesData, roundNumber, roundCount
  })

  function personFor(playerUuid: string): SwissMatchPerson {
    const associateUuid = associateUuidFor(playerUuid)
    const associate = associateUuid ? associatesByUuid.value.get(associateUuid) : undefined
    return {
      associateUuid,
      name: associate?.first_name ?? labelFor(playerUuid),
      surname: associate?.last_name
    }
  }

  function matchPlayersFor(pairing: { playerUuids: string[] }): SwissMatchPlayer[] {
    return pairing.playerUuids.map((playerUuid, index) => {
      const opponentUuid = pairing.playerUuids[index === 0 ? 1 : 0]
      return {
        ...personFor(playerUuid),
        seat: index === 0 ? 0 : 1,
        playerUuid,
        opponent: opponentUuid ? personFor(opponentUuid) : { name: '' },
        dropped: dropByPlayerUuid.value.get(playerUuid) ?? null
      }
    })
  }

  const matchResultByPairingUuid = computed(() =>
    new Map((matchResults.value ?? []).map(result => [result.pairingUuid, result])))

  const reportByPairingUuid = computed(() => new Map(
    (matchReports.value ?? []).map(report => [report.pairingUuid, {
      reporter: personFor(report.reporterUuid),
      status: report.status,
      score: { player1GamesWon: report.player1GamesWon, player2GamesWon: report.player2GamesWon }
    }])
  ))

  // Who reported a confirmed result and who (the pairing's other player)
  // confirmed it — null for a result an organizer entered directly (no
  // reportedByPlayerUuid) or for a pairing without exactly one "other" player.
  function confirmedInfoFor(
    pairing: { playerUuids: string[] }, result: TournamentMatchResult | undefined
  ): SwissMatchConfirmedInfo | null {
    if (!result?.reportedByPlayerUuid) return null
    const confirmerUuid = pairing.playerUuids.find(uuid => uuid !== result.reportedByPlayerUuid)
    if (!confirmerUuid) return null
    return { reporter: personFor(result.reportedByPlayerUuid), confirmer: personFor(confirmerUuid) }
  }

  // Players still waiting for their table's result (a bye has none to enter).
  const pendingPlayerUuids = computed(() => pairingsForRound.value
    .filter(pairing =>
      pairing.playerUuids.length > 1 && !matchResultByPairingUuid.value.has(pairing.uuid))
    .flatMap(pairing => pairing.playerUuids))

  const tournamentIsEnded = computed(() =>
    isLastRoundOfTournament.value && round.value?.status === 'completed')

  return {
    round,
    isLastRoundOfTournament,
    tournamentIsEnded,
    pairingsForRound,
    labelFor,
    associateUuidFor,
    personFor,
    matchPlayersFor,
    matchResultByPairingUuid,
    reportByPairingUuid,
    confirmedInfoFor,
    pendingPlayerUuids,
    liveStandings,
    playedPairs,
    byePlayerUuids,
    dropByPlayerUuid
  }
}

export type SwissRoundData = ReturnType<typeof useSwissRoundData>
