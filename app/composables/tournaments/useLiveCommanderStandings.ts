// app\composables\tournaments\useLiveCommanderStandings.ts
// Reactive standings recomputed from the tournament's current
// results/kills/votes — ported from MagicTheGathering/league's
// useLiveStandings.ts (user request, 2026-09-15/16: copy the live-recompute
// idea as-is), simplified to source from persisted (Pinia Colada-queried)
// data rather than league's own Pinia-store-tracked unsaved local edits
// (this app has no such store for this domain, and doesn't want one — see
// CLAUDE.md's Pinia Colada + BFF convention). Since every result/kill/vote
// mutation invalidates these same queries on settle, this recomputes the
// moment a save lands — "live" relative to the round still being open
// (before advance_commander_round formally persists into
// tournament_standings), not live relative to an unsaved in-progress edit.
import {
  calculatePlayerTableScore, isDrawTable, buildPosValues,
  type CommanderTableResult
} from './useCommanderScoring'
import { compareCommanderStandings } from './useCommanderStandingsSort'

export interface LiveCommanderStanding {
  playerUuid: string
  associateUuid: string
  label: string
  score: number
  victories: number
  kills: number
  brewReceived: number
  playReceived: number
  /** Times killed — feeds the "Vittima" award (useTournamentAwards.ts), not
   *  part of the score/sort itself. */
  deaths: number
}

export function useLiveCommanderStandings(tournamentUuid: MaybeRefOrGetter<string>) {
  const { data: registrations } = useTournamentRegistrationsQuery(tournamentUuid)
  const { data: associatesData } = useAssociatesQuery()
  const { data: pairings } = useTournamentPairingsQuery(tournamentUuid)
  const { data: resultsData } = useTournamentRoundResultsQuery(tournamentUuid)
  const { data: killsData } = useTournamentKillsQuery(tournamentUuid)
  const { data: votesData } = useTournamentVotesQuery(tournamentUuid)
  const { data: rulesetPoints } = useRulesetPointsQuery(tournamentUuid)

  const associateByUuid = computed(() =>
    new Map((associatesData.value ?? []).map(a => [a.uuid, a])))

  const liveStandings = computed<LiveCommanderStanding[]>(() => {
    const ruleset = rulesetPoints.value
    if (!ruleset) return []

    const posValues = buildPosValues(ruleset)

    // One accumulator per registration (a player could in principle be
    // registered without a standings row yet if they registered after the
    // round started — surfaced with zeroes either way).
    const accumulators = new Map<string, LiveCommanderStanding>()
    for (const registration of registrations.value ?? []) {
      const associate = associateByUuid.value.get(registration.associateUuid)
      accumulators.set(registration.playerUuid, {
        playerUuid: registration.playerUuid,
        associateUuid: registration.associateUuid,
        label: associate ? `${associate.first_name} ${associate.last_name}` : registration.associateUuid,
        score: 0,
        victories: 0,
        kills: 0,
        brewReceived: 0,
        playReceived: 0,
        deaths: 0
      })
    }

    for (const pairing of pairings.value ?? []) {
      const tableResults: CommanderTableResult[] = pairing.playerUuids.map((playerUuid) => {
        const result = (resultsData.value ?? []).find(r =>
          r.pairingUuid === pairing.uuid && r.playerUuid === playerUuid)
        return {
          playerUuid,
          position: result?.position ?? null,
          numberOfKills: (killsData.value ?? [])
            .filter(k => k.pairingUuid === pairing.uuid && k.killerUuid === playerUuid).length,
          brewVotesReceived: (votesData.value ?? [])
            .filter(v => v.pairingUuid === pairing.uuid && v.votedPlayerUuid === playerUuid && v.voteType === 'brew')
            .length,
          playVotesReceived: (votesData.value ?? [])
            .filter(v => v.pairingUuid === pairing.uuid && v.votedPlayerUuid === playerUuid && v.voteType === 'play')
            .length
        }
      })

      const isDraw = isDrawTable(tableResults)

      for (const playerUuid of pairing.playerUuids) {
        const scored = calculatePlayerTableScore(playerUuid, tableResults, posValues, ruleset)
        if (!scored) continue

        const acc = accumulators.get(playerUuid)
        if (!acc) continue

        acc.score += scored.totalScore
        acc.victories += scored.position === 1 && !isDraw ? 1 : 0
        acc.kills += scored.numberOfKills
        acc.brewReceived += scored.brewVotesReceived
        acc.playReceived += scored.playVotesReceived
        acc.deaths += (killsData.value ?? [])
          .filter(k => k.pairingUuid === pairing.uuid && k.killedPlayerUuid === playerUuid).length
      }
    }

    // LiveCommanderStanding already has every field StandingSortable needs
    // (playerUuid/score/victories/kills/brewReceived/playReceived) — passed
    // straight through rather than rebuilt into a separate object literal.
    return Array.from(accumulators.values()).sort(compareCommanderStandings)
  })

  return { liveStandings }
}
