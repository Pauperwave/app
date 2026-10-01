// shared\utils\tournaments\commanderPlayerReport.ts
// One player's per-round "pagella": where they placed, who they killed, who
// voted for them and the points each of those was worth. Reuses
// calculatePlayerTableScore so the numbers can never drift from the standings.
import {
  buildPosValues, calculatePlayerTableScore,
  type CommanderTableResult, type RulesetPointValues
} from './commanderScoring'

export interface ReportRound {
  uuid: string
  roundNumber: number
}

export interface ReportPairing {
  uuid: string
  roundUuid: string
  tableNumber: number | null
  playerUuids: string[]
}

export interface ReportResult {
  pairingUuid: string
  playerUuid: string
  position: number | null
  commanderDeckUuid?: string | null
}

export interface ReportKill {
  pairingUuid: string
  killerUuid: string
  killedPlayerUuid: string
}

export interface ReportVote {
  pairingUuid: string
  voterUuid: string
  votedPlayerUuid: string
  voteType: 'brew' | 'play'
}

export interface PlayerReportRound {
  roundNumber: number
  tableNumber: number | null
  /** Null while the player has no valid placement: nothing counts for that round. */
  position: number | null
  /** The deck the player used at that table, if one was entered. */
  commanderDeckUuid: string | null
  /** The other seats at the table, in seat order — the rows of the votes grid. */
  opponentUuids: string[]
  rankScore: number
  killedPlayerUuids: string[]
  killScore: number
  brewVoterUuids: string[]
  brewScore: number
  playVoterUuids: string[]
  playScore: number
  /** Who this player gave their own brew/play vote to at that table (worth nothing to them). */
  brewVotedPlayerUuid: string | null
  playVotedPlayerUuid: string | null
  totalScore: number
}

export function buildCommanderPlayerReport(input: {
  playerUuid: string
  rounds: ReportRound[]
  pairings: ReportPairing[]
  results: ReportResult[]
  kills: ReportKill[]
  votes: ReportVote[]
  ruleset: RulesetPointValues
}): PlayerReportRound[] {
  const {
    playerUuid, rounds, pairings, results, kills, votes, ruleset
  } = input
  const posValues = buildPosValues(ruleset)

  return [...rounds]
    .sort((a, b) => a.roundNumber - b.roundNumber)
    .flatMap((round): PlayerReportRound[] => {
      const pairing = pairings.find(p =>
        p.roundUuid === round.uuid && p.playerUuids.includes(playerUuid))
      if (!pairing) return []

      const inPairing = (uuid: string) => ({ pairingUuid: pairing.uuid, uuid })
      const tableResults: CommanderTableResult[] = pairing.playerUuids.map((uuid) => {
        const { pairingUuid } = inPairing(uuid)
        const votesReceived = (voteType: ReportVote['voteType']) => votes.filter(v =>
          v.pairingUuid === pairingUuid && v.votedPlayerUuid === uuid && v.voteType === voteType)
        return {
          playerUuid: uuid,
          position: results.find(r =>
            r.pairingUuid === pairingUuid && r.playerUuid === uuid)?.position ?? null,
          numberOfKills: kills.filter(k =>
            k.pairingUuid === pairingUuid && k.killerUuid === uuid).length,
          brewVotesReceived: votesReceived('brew').length,
          playVotesReceived: votesReceived('play').length
        }
      })

      const votedFor = (voteType: ReportVote['voteType']) => votes.find(v =>
        v.pairingUuid === pairing.uuid && v.voterUuid === playerUuid && v.voteType === voteType)
        ?.votedPlayerUuid ?? null
      const brewVotedPlayerUuid = votedFor('brew')
      const playVotedPlayerUuid = votedFor('play')

      const votersFor = (voteType: ReportVote['voteType']) => votes
        .filter(v => v.pairingUuid === pairing.uuid
          && v.votedPlayerUuid === playerUuid
          && v.voteType === voteType)
        .map(v => v.voterUuid)
      const opponentUuids = pairing.playerUuids.filter(uuid => uuid !== playerUuid)

      const commanderDeckUuid = results.find(r =>
        r.pairingUuid === pairing.uuid && r.playerUuid === playerUuid)?.commanderDeckUuid ?? null

      const scored = calculatePlayerTableScore(playerUuid, tableResults, posValues, ruleset)
      if (!scored) {
        return [{
          roundNumber: round.roundNumber,
          tableNumber: pairing.tableNumber,
          position: null,
          commanderDeckUuid,
          opponentUuids,
          rankScore: 0,
          killedPlayerUuids: [],
          killScore: 0,
          // The votes are facts and stay visible, but without a placement none of them scores.
          brewVoterUuids: votersFor('brew'),
          brewScore: 0,
          playVoterUuids: votersFor('play'),
          playScore: 0,
          brewVotedPlayerUuid,
          playVotedPlayerUuid,
          totalScore: 0
        }]
      }

      return [{
        roundNumber: round.roundNumber,
        tableNumber: pairing.tableNumber,
        position: scored.position,
        commanderDeckUuid,
        opponentUuids,
        rankScore: scored.scoreRank,
        killedPlayerUuids: kills
          .filter(k => k.pairingUuid === pairing.uuid && k.killerUuid === playerUuid)
          .map(k => k.killedPlayerUuid),
        killScore: scored.killScore,
        brewVoterUuids: votersFor('brew'),
        brewScore: scored.brewScore,
        playVoterUuids: votersFor('play'),
        playScore: scored.playScore,
        brewVotedPlayerUuid,
        playVotedPlayerUuid,
        totalScore: scored.totalScore
      }]
    })
}
