// app\composables\tournaments\rounds\useSwissRoundData.ts
// The shared substrate SwissRoundManager.vue's submit-handlers/lifecycle composables and template
// read: the raw per-round queries plus every derived lookup (personFor, matchPlayersFor,
// telegramInfoFor, pendingPlayerUuids, ...), the same split as useCommanderRoundData.ts
import type { SwissMatchPerson, SwissMatchPlayer, SwissMatchTelegramInfo } from '~/types'
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
  const { data: registrations } = useTournamentRegistrationsQuery(tournamentUuid)
  // Live-updates matchResults/pairings as the Telegram bot writes, so an organizer sees a submitted
  // result and the opponent's confirmation/dispute without refreshing
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

  // Who reported this result via Telegram and whether/when the opponent answered; null for an
  // organizer-entered result (no reportedByPlayerUuid). Drives SwissMatchResultBadge.vue's
  // "Inserito da X" state
  function telegramInfoFor(
    result: TournamentMatchResult | undefined
  ): SwissMatchTelegramInfo | null {
    if (!result?.reportedByPlayerUuid) return null
    return {
      reporter: personFor(result.reportedByPlayerUuid),
      reportedAt: result.createdAt,
      confirmedAt: result.confirmedAt,
      disputedAt: result.disputedAt
    }
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
    telegramInfoFor,
    pendingPlayerUuids,
    liveStandings,
    playedPairs,
    byePlayerUuids,
    dropByPlayerUuid
  }
}

export type SwissRoundData = ReturnType<typeof useSwissRoundData>
