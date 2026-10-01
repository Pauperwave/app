// test\unit\utils\tournaments\commanderPlayerReport.test.ts
import { describe, expect, it } from 'vitest'
import { buildCommanderPlayerReport } from '#shared/utils/tournaments/commanderPlayerReport'

const ruleset = {
  rank1: 4, rank2: 3, rank3: 2, rank4: 1, kill: 1, brew: 2, play: 2
}
const rounds = [
  { uuid: 'r2', roundNumber: 2 },
  { uuid: 'r1', roundNumber: 1 }
]
const pairings = [
  { uuid: 'pair1', roundUuid: 'r1', tableNumber: 3, playerUuids: ['a', 'b', 'c', 'd'] },
  { uuid: 'pair2', roundUuid: 'r2', tableNumber: 1, playerUuids: ['a', 'b', 'e', 'f'] }
]
const results = [
  { pairingUuid: 'pair1', playerUuid: 'a', position: 1, commanderDeckUuid: 'deck-a1' },
  { pairingUuid: 'pair1', playerUuid: 'b', position: 2 },
  { pairingUuid: 'pair1', playerUuid: 'c', position: 3 },
  { pairingUuid: 'pair1', playerUuid: 'd', position: 4 },
  { pairingUuid: 'pair2', playerUuid: 'a', position: 2 },
  { pairingUuid: 'pair2', playerUuid: 'b', position: 1 },
  { pairingUuid: 'pair2', playerUuid: 'e', position: 3 },
  { pairingUuid: 'pair2', playerUuid: 'f', position: null }
]
const kills = [
  { pairingUuid: 'pair1', killerUuid: 'a', killedPlayerUuid: 'd' },
  { pairingUuid: 'pair1', killerUuid: 'a', killedPlayerUuid: 'c' }
]
const votes = [
  { pairingUuid: 'pair2', voterUuid: 'f', votedPlayerUuid: 'e', voteType: 'brew' as const },
  { pairingUuid: 'pair2', voterUuid: 'e', votedPlayerUuid: 'f', voteType: 'play' as const },
  { pairingUuid: 'pair1', voterUuid: 'a', votedPlayerUuid: 'b', voteType: 'brew' as const },
  { pairingUuid: 'pair1', voterUuid: 'a', votedPlayerUuid: 'c', voteType: 'play' as const },
  { pairingUuid: 'pair1', voterUuid: 'b', votedPlayerUuid: 'a', voteType: 'brew' as const },
  { pairingUuid: 'pair1', voterUuid: 'c', votedPlayerUuid: 'a', voteType: 'play' as const },
  { pairingUuid: 'pair1', voterUuid: 'd', votedPlayerUuid: 'a', voteType: 'play' as const }
]

function report(playerUuid: string) {
  return buildCommanderPlayerReport({
    playerUuid, rounds, pairings, results, kills, votes, ruleset
  })
}

describe('buildCommanderPlayerReport', () => {
  it('lists the rounds in order, with the table the player sat at', () => {
    const rows = report('a')
    expect(rows.map(r => [r.roundNumber, r.tableNumber])).toEqual([[1, 3], [2, 1]])
  })

  it('breaks a round down into placement, kills and votes received', () => {
    const [round1] = report('a')
    expect(round1).toMatchObject({
      position: 1,
      rankScore: 4,
      killedPlayerUuids: ['d', 'c'],
      killScore: 2,
      brewVoterUuids: ['b'],
      brewScore: 2,
      playVoterUuids: ['c', 'd'],
      playScore: 4,
      totalScore: 12
    })
  })

  it('reports who the player gave their own brew and play votes to', () => {
    const [round1, round2] = report('a')
    expect(round1).toMatchObject({ brewVotedPlayerUuid: 'b', playVotedPlayerUuid: 'c' })
    expect(round2).toMatchObject({ brewVotedPlayerUuid: null, playVotedPlayerUuid: null })
  })

  it('does not count the votes a player gave towards their own score', () => {
    const [round1] = report('a')
    expect(round1?.brewScore).toBe(2)
    expect(round1?.playScore).toBe(4)
  })

  it('reports the deck used in each round, or null when none was entered', () => {
    expect(report('a').map(r => r.commanderDeckUuid)).toEqual(['deck-a1', null])
  })

  it('skips rounds the player did not sit in', () => {
    expect(report('c').map(r => r.roundNumber)).toEqual([1])
  })

  it('scores a round without a valid placement as zero, but still lists its votes', () => {
    const rows = report('f')
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      position: null,
      totalScore: 0,
      brewScore: 0,
      playScore: 0,
      killedPlayerUuids: [],
      playVoterUuids: ['e'],
      brewVotedPlayerUuid: 'e'
    })
  })

  it('lists the other seats of the table, without the player themselves', () => {
    expect(report('a')[0]?.opponentUuids).toEqual(['b', 'c', 'd'])
    expect(report('a')[1]?.opponentUuids).toEqual(['b', 'e', 'f'])
  })
})
