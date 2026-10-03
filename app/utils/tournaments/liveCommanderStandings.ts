// app\utils\tournaments\liveCommanderStandings.ts
// The live standings of a Commander tournament, recomputed from its current registrations, pairings,
// results, kills and votes (useLiveCommanderStandings.ts feeds it the Pinia Colada data). Pure on
// purpose: this is the scoring everyone reads the ranking from, so it is unit-tested apart from
// the queries.
import {
  buildPosValues,
  calculatePlayerTableScore,
  isDrawTable,
  type CommanderTableResult,
  type PlayerTableScore,
  type RulesetPointValues
} from '#shared/utils/tournaments/commanderScoring'
import type { SwissDropInfo } from '~/types'
import { compareCommanderStandings } from '~/composables/tournaments/pairing/useCommanderStandingsSort'

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

interface Registration {
  playerUuid: string
  associateUuid: string
}

interface AssociateName {
  first_name: string
  last_name: string
}

interface Pairing {
  uuid: string
  roundUuid: string
  playerUuids: string[]
}

interface RoundResult {
  pairingUuid: string
  playerUuid: string
  position: number | null
}

interface Kill {
  pairingUuid: string
  killerUuid: string
  killedPlayerUuid: string
}

interface Vote {
  pairingUuid: string
  votedPlayerUuid: string
  voterUuid: string
  voteType: string
}

export interface LiveStandingsInput {
  ruleset: RulesetPointValues
  registrations: Registration[]
  associateByUuid: Map<string, AssociateName>
  pairings: Pairing[]
  results: RoundResult[]
  kills: Kill[]
  votes: Vote[]
  dropByPlayerUuid: Map<string, SwissDropInfo>
}

// Which rounds and which voters a player's votes came from, per vote kind
interface VoteSources {
  brewRounds: Set<string>
  playRounds: Set<string>
  brewVoters: Set<string>
  playVoters: Set<string>
}

function groupByPairing<T extends { pairingUuid: string }>(items: T[]): Map<string, T[]> {
  const groups = new Map<string, T[]>()
  for (const item of items) {
    const group = groups.get(item.pairingUuid) ?? []
    group.push(item)
    groups.set(item.pairingUuid, group)
  }
  return groups
}

// A registration with no results yet shows with zeroes
function emptyStanding(
  registration: Registration,
  associate: AssociateName | undefined,
  dropped: SwissDropInfo | null
): LiveCommanderStanding {
  return {
    playerUuid: registration.playerUuid,
    associateUuid: registration.associateUuid,
    label: associate
      ? `${associate.first_name} ${associate.last_name}`
      : registration.associateUuid,
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
    dropped
  }
}

// What each seat of a table scored: its position and the kills and votes it received
function tableResultsOf(
  pairing: Pairing,
  results: RoundResult[],
  kills: Kill[],
  votes: Vote[]
): CommanderTableResult[] {
  return pairing.playerUuids.map(playerUuid => ({
    playerUuid,
    position: results.find(result => result.playerUuid === playerUuid)?.position ?? null,
    numberOfKills: kills.filter(kill => kill.killerUuid === playerUuid).length,
    brewVotesReceived: votes
      .filter(vote => vote.votedPlayerUuid === playerUuid && vote.voteType === 'brew').length,
    playVotesReceived: votes
      .filter(vote => vote.votedPlayerUuid === playerUuid && vote.voteType === 'play').length
  }))
}

function voteSourcesOf(sourcesByPlayer: Map<string, VoteSources>, playerUuid: string): VoteSources {
  const sources = sourcesByPlayer.get(playerUuid) ?? {
    brewRounds: new Set<string>(),
    playRounds: new Set<string>(),
    brewVoters: new Set<string>(),
    playVoters: new Set<string>()
  }
  sourcesByPlayer.set(playerUuid, sources)
  return sources
}

// One seat's score of one table, added to the player's running totals
function addTableToStanding(
  standing: LiveCommanderStanding,
  scored: PlayerTableScore,
  isDraw: boolean,
  deaths: number
) {
  standing.score += scored.totalScore
  standing.victories += scored.position === 1 && !isDraw ? 1 : 0
  standing.kills += scored.numberOfKills
  standing.brewReceived += scored.brewVotesReceived
  standing.playReceived += scored.playVotesReceived
  standing.brewScore += scored.brewScore
  standing.playScore += scored.playScore
  standing.roundsPlayed += 1
  standing.deaths += deaths
}

// Where a player's votes at one table came from: the round (every vote of a table shares it) and
// the voter
function recordVoteSources(sources: VoteSources, votes: Vote[], roundUuid: string) {
  for (const vote of votes) {
    if (vote.voteType === 'brew') {
      sources.brewRounds.add(roundUuid)
      sources.brewVoters.add(vote.voterUuid)
    } else {
      sources.playRounds.add(roundUuid)
      sources.playVoters.add(vote.voterUuid)
    }
  }
}

export function buildLiveCommanderStandings(input: LiveStandingsInput): LiveCommanderStanding[] {
  const { ruleset, associateByUuid, dropByPlayerUuid } = input
  const posValues = buildPosValues(ruleset)

  // One accumulator per registration (a player may have no standings row yet if they registered
  // after the round started)
  const standings = new Map(input.registrations.map(registration => [
    registration.playerUuid,
    emptyStanding(
      registration,
      associateByUuid.get(registration.associateUuid),
      dropByPlayerUuid.get(registration.playerUuid) ?? null
    )
  ]))
  const sourcesByPlayer = new Map<string, VoteSources>()

  const resultsByPairing = groupByPairing(input.results)
  const killsByPairing = groupByPairing(input.kills)
  const votesByPairing = groupByPairing(input.votes)

  for (const pairing of input.pairings) {
    const results = resultsByPairing.get(pairing.uuid) ?? []
    const kills = killsByPairing.get(pairing.uuid) ?? []
    const votes = votesByPairing.get(pairing.uuid) ?? []

    const tableResults = tableResultsOf(pairing, results, kills, votes)
    const isDraw = isDrawTable(tableResults)

    for (const playerUuid of pairing.playerUuids) {
      const scored = calculatePlayerTableScore(playerUuid, tableResults, posValues, ruleset)
      const standing = standings.get(playerUuid)
      if (!scored || !standing) continue

      const deaths = kills.filter(kill => kill.killedPlayerUuid === playerUuid).length
      addTableToStanding(standing, scored, isDraw, deaths)

      recordVoteSources(
        voteSourcesOf(sourcesByPlayer, playerUuid),
        votes.filter(vote => vote.votedPlayerUuid === playerUuid),
        pairing.roundUuid
      )
    }
  }

  for (const [playerUuid, standing] of standings) {
    const sources = sourcesByPlayer.get(playerUuid)
    standing.brewRounds = sources?.brewRounds.size ?? 0
    standing.playRounds = sources?.playRounds.size ?? 0
    standing.brewVoters = sources?.brewVoters.size ?? 0
    standing.playVoters = sources?.playVoters.size ?? 0
  }

  // LiveCommanderStanding already has every StandingSortable field: passed straight through
  return Array.from(standings.values()).sort(compareCommanderStandings)
}
