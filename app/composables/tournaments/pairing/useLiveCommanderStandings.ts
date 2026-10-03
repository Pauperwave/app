// app\composables\tournaments\pairing\useLiveCommanderStandings.ts
// Reactive standings recomputed from the tournament's current results/kills/votes, ported from
// league's useLiveStandings.ts but sourced from persisted (Pinia Colada) data instead of unsaved
// local store edits (no such store here, see CLAUDE.md's Pinia Colada + BFF convention). Every
// result/kill/vote mutation invalidates these queries, so it recomputes as soon as a save lands:
// "live" relative to the open round (before advance_commander_round persists into
// tournament_standings), not to an unsaved edit.
import {
  calculatePlayerTableScore, isDrawTable, buildPosValues,
  type CommanderTableResult
} from '#shared/utils/tournaments/commanderScoring'
import type { SwissDropInfo } from '~/types'
import { compareCommanderStandings } from './useCommanderStandingsSort'

export interface LiveCommanderStanding {
  playerUuid: string
  associateUuid: string
  label: string
  // Real first-name/surname pair alongside `label` (kept for display/search callers): see
  // TablePlayer.firstName/surname on why splitting `label` mishandles compound surnames
  firstName: string
  surname: string
  score: number
  victories: number
  kills: number
  brewReceived: number
  playReceived: number
  /** Points those votes were worth (votes x the ruleset's brew/play value). */
  brewScore: number
  playScore: number
  /** Tables the player actually sat at — the denominator of the kills/deaths rates. */
  roundsPlayed: number
  /** Different rounds / different voters the votes came from. Only tiebreaks of the vote awards
   *  (useTournamentAwards.ts): votes spread wide beat votes from one round or one person. */
  brewRounds: number
  playRounds: number
  brewVoters: number
  playVoters: number
  /** Times killed — feeds the "Vittima" award (useTournamentAwards.ts), not
   *  part of the score/sort itself. */
  deaths: number
  /** Set once the player dropped: they keep their place but aren't paired any more. */
  dropped: SwissDropInfo | null
}

function addToSet(setsByPlayer: Map<string, Set<string>>, playerUuid: string, value: string) {
  const values = setsByPlayer.get(playerUuid) ?? new Set<string>()
  values.add(value)
  setsByPlayer.set(playerUuid, values)
}

export function useLiveCommanderStandings(tournamentUuid: MaybeRefOrGetter<string>) {
  const { data: registrations } = useTournamentRegistrationsQuery(tournamentUuid)
  const { data: associatesData } = useAssociatesQuery()
  const { data: pairings } = useTournamentPairingsQuery(tournamentUuid)
  const { data: resultsData } = useTournamentRoundResultsQuery(tournamentUuid)
  const { data: killsData } = useTournamentKillsQuery(tournamentUuid)
  const { data: votesData } = useTournamentVotesQuery(tournamentUuid)
  // fallow-ignore-next-line code-duplication -- same query wiring as the sibling
  const { data: rulesetPoints } = useRulesetPointsQuery(tournamentUuid)
  const dropByPlayerUuid = useDropInfoByPlayerUuid(tournamentUuid)

  const associateByUuid = computed(() =>
    new Map((associatesData.value ?? []).map(a => [a.uuid, a])))

  const liveStandings = computed<LiveCommanderStanding[]>(() => {
    const ruleset = rulesetPoints.value
    if (!ruleset) return []

    const posValues = buildPosValues(ruleset)

    // One accumulator per registration (a player may have no standings row yet if they registered
    // after the round started): shown with zeroes either way
    const accumulators = new Map<string, LiveCommanderStanding>()
    const brewRoundsByPlayer = new Map<string, Set<string>>()
    const playRoundsByPlayer = new Map<string, Set<string>>()
    const brewVotersByPlayer = new Map<string, Set<string>>()
    const playVotersByPlayer = new Map<string, Set<string>>()
    for (const registration of registrations.value ?? []) {
      const associate = associateByUuid.value.get(registration.associateUuid)
      accumulators.set(registration.playerUuid, {
        playerUuid: registration.playerUuid,
        associateUuid: registration.associateUuid,
        label: associate ? `${associate.first_name} ${associate.last_name}` : registration.associateUuid,
        firstName: associate?.first_name ?? registration.associateUuid,
        surname: associate?.last_name ?? '',
        score: 0,
        victories: 0,
        kills: 0,
        brewReceived: 0,
        playReceived: 0,
        brewScore: 0,
        playScore: 0,
        roundsPlayed: 0,
        brewRounds: 0,
        playRounds: 0,
        brewVoters: 0,
        playVoters: 0,
        deaths: 0,
        dropped: dropByPlayerUuid.value.get(registration.playerUuid) ?? null
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
        acc.brewScore += scored.brewScore
        acc.playScore += scored.playScore
        acc.roundsPlayed += 1
        for (const vote of votesData.value ?? []) {
          if (vote.pairingUuid !== pairing.uuid || vote.votedPlayerUuid !== playerUuid) continue
          const isBrew = vote.voteType === 'brew'
          addToSet(isBrew ? brewRoundsByPlayer : playRoundsByPlayer, playerUuid, pairing.roundUuid)
          addToSet(isBrew ? brewVotersByPlayer : playVotersByPlayer, playerUuid, vote.voterUuid)
        }
        acc.deaths += (killsData.value ?? [])
          .filter(k => k.pairingUuid === pairing.uuid && k.killedPlayerUuid === playerUuid).length
      }
    }

    for (const [playerUuid, acc] of accumulators) {
      acc.brewRounds = brewRoundsByPlayer.get(playerUuid)?.size ?? 0
      acc.playRounds = playRoundsByPlayer.get(playerUuid)?.size ?? 0
      acc.brewVoters = brewVotersByPlayer.get(playerUuid)?.size ?? 0
      acc.playVoters = playVotersByPlayer.get(playerUuid)?.size ?? 0
    }

    // LiveCommanderStanding already has every StandingSortable field: passed straight through
    return Array.from(accumulators.values()).sort(compareCommanderStandings)
  })

  return { liveStandings, dropByPlayerUuid }
}
