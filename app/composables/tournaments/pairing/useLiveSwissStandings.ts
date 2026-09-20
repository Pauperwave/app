// app\composables\tournaments\pairing\useLiveSwissStandings.ts
// Reactive standings of a 1v1 Swiss tournament, derived from its pairings,
// match results and drops (no persisted standings table — user decision,
// 2026-09-20). Every result mutation invalidates and optimistically updates
// the results query, so this recomputes the moment a score is picked.
import type { SwissDropInfo } from '~/types'
import {
  calculateSwissStandings, type SwissMatch, type SwissStandingStats
} from '~/utils/tournaments/swissScoring'

export interface LiveSwissStanding extends SwissStandingStats {
  associateUuid: string
  label: string
  /** Set once the player dropped: they keep their place but aren't paired any more. */
  dropped: SwissDropInfo | null
}

export function useLiveSwissStandings(tournamentUuid: MaybeRefOrGetter<string>) {
  const { data: registrations } = useTournamentRegistrationsQuery(tournamentUuid)
  const { data: associatesData } = useAssociatesQuery()
  const { data: pairings } = useTournamentPairingsQuery(tournamentUuid)
  const { data: matchResults } = useTournamentMatchResultsQuery(tournamentUuid)
  const { data: rounds } = useTournamentRoundsQuery(tournamentUuid)
  const { data: drops } = useTournamentDropsQuery(tournamentUuid)

  const associateByUuid = computed(() =>
    new Map((associatesData.value ?? []).map(a => [a.uuid, a])))
  const associateUuidByPlayerUuid = computed(() =>
    new Map((registrations.value ?? []).map(r => [r.playerUuid, r.associateUuid])))

  // Every pair that already sat at the same table, in any round (byes excluded).
  const playedPairs = computed<[string, string][]>(() =>
    (pairings.value ?? []).flatMap((pairing) => {
      const [player1Uuid, player2Uuid] = pairing.playerUuids
      return player1Uuid && player2Uuid ? [[player1Uuid, player2Uuid] as [string, string]] : []
    }))

  // Players who already had a bye — nobody gets a second one.
  const byePlayerUuids = computed(() => (pairings.value ?? [])
    .filter(pairing => pairing.playerUuids.length === 1)
    .flatMap(pairing => pairing.playerUuids))

  const dropByPlayerUuid = computed(() => {
    const roundNumberByUuid = new Map((rounds.value ?? []).map(r => [r.uuid, r.roundNumber]))
    return new Map((drops.value ?? []).map(drop => [drop.playerUuid, {
      roundNumber: roundNumberByUuid.get(drop.roundUuid) ?? 0,
      droppedAt: drop.droppedAt
    } satisfies SwissDropInfo]))
  })

  const liveStandings = computed<LiveSwissStanding[]>(() => {
    const resultByPairingUuid = new Map(
      (matchResults.value ?? []).map(result => [result.pairingUuid, result])
    )

    const playerUuids: string[] = []
    const matches: SwissMatch[] = []
    const byePlayerUuids: string[] = []
    for (const pairing of pairings.value ?? []) {
      playerUuids.push(...pairing.playerUuids)

      const [player1Uuid, player2Uuid] = pairing.playerUuids
      if (player1Uuid && !player2Uuid) {
        byePlayerUuids.push(player1Uuid)
        continue
      }

      const result = resultByPairingUuid.get(pairing.uuid)
      if (player1Uuid && player2Uuid && result) {
        matches.push({
          player1Uuid,
          player2Uuid,
          player1GamesWon: result.player1GamesWon,
          player2GamesWon: result.player2GamesWon
        })
      }
    }

    return calculateSwissStandings(Array.from(new Set(playerUuids)), matches, byePlayerUuids)
      .map((stats) => {
        const associateUuid = associateUuidByPlayerUuid.value.get(stats.playerUuid) ?? ''
        const associate = associateByUuid.value.get(associateUuid)
        return {
          ...stats,
          associateUuid,
          label: associate ? `${associate.first_name} ${associate.last_name}` : associateUuid,
          dropped: dropByPlayerUuid.value.get(stats.playerUuid) ?? null
        }
      })
  })

  return { liveStandings, playedPairs, byePlayerUuids, dropByPlayerUuid }
}
