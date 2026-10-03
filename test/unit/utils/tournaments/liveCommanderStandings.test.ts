// test\unit\utils\tournaments\liveCommanderStandings.test.ts
import { describe, expect, it } from 'vitest'
import {
  buildLiveCommanderStandings,
  type LiveStandingsInput
} from '~/utils/tournaments/liveCommanderStandings'
import type { SwissDropInfo } from '~/types'

// 1st..4th are worth 5/3/2/1, a kill 1, a brew vote 2 and a play vote 1
const RULESET = { rank1: 5, rank2: 3, rank3: 2, rank4: 1, kill: 1, brew: 2, play: 1 }

const PLAYERS = ['p1', 'p2', 'p3', 'p4']

function input(overrides: Partial<LiveStandingsInput> = {}): LiveStandingsInput {
  return {
    ruleset: RULESET,
    registrations: PLAYERS.map(playerUuid => ({ playerUuid, associateUuid: `a-${playerUuid}` })),
    associateByUuid: new Map(PLAYERS.map(playerUuid => [
      `a-${playerUuid}`, { first_name: playerUuid.toUpperCase(), last_name: 'Rossi' }
    ])),
    pairings: [{ uuid: 'pair-1', roundUuid: 'round-1', playerUuids: PLAYERS }],
    results: [],
    kills: [],
    votes: [],
    dropByPlayerUuid: new Map(),
    ...overrides
  }
}

function rank(playerUuid: string, position: number, pairingUuid = 'pair-1') {
  return { pairingUuid, playerUuid, position }
}

function standingOf(result: ReturnType<typeof buildLiveCommanderStandings>, playerUuid: string) {
  const standing = result.find(item => item.playerUuid === playerUuid)
  if (!standing) throw new Error(`no standing for ${playerUuid}`)
  return standing
}

describe('buildLiveCommanderStandings', () => {
  describe('a registration with nothing played', () => {
    it('shows zeroes, named after the associate', () => {
      const result = buildLiveCommanderStandings(input())

      expect(standingOf(result, 'p1')).toMatchObject({
        label: 'P1 Rossi', firstName: 'P1', surname: 'Rossi', score: 0, roundsPlayed: 0, deaths: 0
      })
    })

    it('falls back to the associate uuid when the associate is unknown', () => {
      const result = buildLiveCommanderStandings(input({ associateByUuid: new Map() }))

      expect(standingOf(result, 'p1')).toMatchObject({
        label: 'a-p1', firstName: 'a-p1', surname: ''
      })
    })

    it('carries the drop info of a player who dropped', () => {
      const dropped = { roundNumber: 2 } as unknown as SwissDropInfo

      const result = buildLiveCommanderStandings(input({
        dropByPlayerUuid: new Map([['p2', dropped]])
      }))

      expect(standingOf(result, 'p2').dropped).toBe(dropped)
      expect(standingOf(result, 'p1').dropped).toBeNull()
    })

    it('returns nobody without registrations', () => {
      expect(buildLiveCommanderStandings(input({ registrations: [] }))).toEqual([])
    })
  })

  describe('scoring a table', () => {
    const fullTable = () => input({
      results: [rank('p1', 1), rank('p2', 2), rank('p3', 3), rank('p4', 4)]
    })

    it('scores the placement of each seat, best first', () => {
      const result = buildLiveCommanderStandings(fullTable())

      expect(result.map(item => [item.playerUuid, item.score])).toEqual([
        ['p1', 5], ['p2', 3], ['p3', 2], ['p4', 1]
      ])
    })

    it('counts a win for the first place, and a table played for everyone', () => {
      const result = buildLiveCommanderStandings(fullTable())

      expect(standingOf(result, 'p1')).toMatchObject({ victories: 1, roundsPlayed: 1 })
      expect(standingOf(result, 'p4')).toMatchObject({ victories: 0, roundsPlayed: 1 })
    })

    it('adds the kills a player made, and the deaths a player suffered', () => {
      const result = buildLiveCommanderStandings(input({
        ...fullTable(),
        kills: [
          { pairingUuid: 'pair-1', killerUuid: 'p1', killedPlayerUuid: 'p4' },
          { pairingUuid: 'pair-1', killerUuid: 'p1', killedPlayerUuid: 'p3' },
          { pairingUuid: 'pair-1', killerUuid: 'p2', killedPlayerUuid: 'p4' }
        ]
      }))

      expect(standingOf(result, 'p1')).toMatchObject({ kills: 2, score: 5 + 2 })
      expect(standingOf(result, 'p4')).toMatchObject({ deaths: 2, kills: 0 })
      expect(standingOf(result, 'p3')).toMatchObject({ deaths: 1 })
    })

    it('does not count a seat with no result yet as a table played', () => {
      const result = buildLiveCommanderStandings(input({ results: [rank('p1', 1)] }))

      expect(standingOf(result, 'p1').roundsPlayed).toBe(1)
      expect(standingOf(result, 'p2').roundsPlayed).toBe(0)
    })

    it('ignores a seat of someone who is not registered', () => {
      const result = buildLiveCommanderStandings(input({
        registrations: [{ playerUuid: 'p1', associateUuid: 'a-p1' }],
        results: [rank('p1', 1), rank('p2', 2)]
      }))

      expect(result.map(item => item.playerUuid)).toEqual(['p1'])
    })

    it('keeps the results of one table out of another', () => {
      const result = buildLiveCommanderStandings(input({
        pairings: [
          { uuid: 'pair-1', roundUuid: 'round-1', playerUuids: ['p1', 'p2'] },
          { uuid: 'pair-2', roundUuid: 'round-1', playerUuids: ['p3', 'p4'] }
        ],
        results: [rank('p1', 1, 'pair-1'), rank('p2', 2, 'pair-1'), rank('p3', 2, 'pair-2')]
      }))

      expect(standingOf(result, 'p1').score).toBe(5)
      expect(standingOf(result, 'p3').score).toBe(0)
    })

    it('adds up several rounds', () => {
      const result = buildLiveCommanderStandings(input({
        pairings: [
          { uuid: 'pair-1', roundUuid: 'round-1', playerUuids: PLAYERS },
          { uuid: 'pair-2', roundUuid: 'round-2', playerUuids: PLAYERS }
        ],
        results: [
          rank('p1', 1, 'pair-1'), rank('p2', 2, 'pair-1'), rank('p3', 3, 'pair-1'), rank('p4', 4, 'pair-1'),
          rank('p2', 1, 'pair-2'), rank('p1', 2, 'pair-2'), rank('p3', 3, 'pair-2'), rank('p4', 4, 'pair-2')
        ]
      }))

      expect(standingOf(result, 'p1')).toMatchObject({ score: 5 + 3, victories: 1, roundsPlayed: 2 })
      expect(standingOf(result, 'p2')).toMatchObject({ score: 3 + 5, victories: 1 })
    })
  })

  describe('wins', () => {
    it('credits nobody in a draw: everyone first and no kills', () => {
      const result = buildLiveCommanderStandings(input({
        results: PLAYERS.map(playerUuid => rank(playerUuid, 1))
      }))

      expect(result.every(item => item.victories === 0)).toBe(true)
    })

    it('credits every player tied for first once there is a kill', () => {
      const result = buildLiveCommanderStandings(input({
        results: [rank('p1', 1), rank('p2', 1), rank('p3', 2), rank('p4', 3)],
        kills: [{ pairingUuid: 'pair-1', killerUuid: 'p1', killedPlayerUuid: 'p4' }]
      }))

      expect(standingOf(result, 'p1').victories).toBe(1)
      expect(standingOf(result, 'p2').victories).toBe(1)
      expect(standingOf(result, 'p3').victories).toBe(0)
    })
  })

  describe('votes', () => {
    const results = [rank('p1', 1), rank('p2', 2), rank('p3', 3), rank('p4', 4)]

    it('scores brew and play votes at the ruleset value', () => {
      const result = buildLiveCommanderStandings(input({
        results,
        votes: [
          { pairingUuid: 'pair-1', votedPlayerUuid: 'p2', voterUuid: 'p1', voteType: 'brew' },
          { pairingUuid: 'pair-1', votedPlayerUuid: 'p2', voterUuid: 'p3', voteType: 'brew' },
          { pairingUuid: 'pair-1', votedPlayerUuid: 'p2', voterUuid: 'p4', voteType: 'play' }
        ]
      }))

      expect(standingOf(result, 'p2')).toMatchObject({
        brewReceived: 2, brewScore: 4, playReceived: 1, playScore: 1, score: 3 + 4 + 1
      })
    })

    it('counts the distinct voters and rounds the votes came from', () => {
      const result = buildLiveCommanderStandings(input({
        pairings: [
          { uuid: 'pair-1', roundUuid: 'round-1', playerUuids: PLAYERS },
          { uuid: 'pair-2', roundUuid: 'round-2', playerUuids: PLAYERS }
        ],
        results: [...results, ...results.map(item => ({ ...item, pairingUuid: 'pair-2' }))],
        votes: [
          // p2 gets three brew votes: two from p1 (one per round) and one from p3 in round 2
          { pairingUuid: 'pair-1', votedPlayerUuid: 'p2', voterUuid: 'p1', voteType: 'brew' },
          { pairingUuid: 'pair-2', votedPlayerUuid: 'p2', voterUuid: 'p1', voteType: 'brew' },
          { pairingUuid: 'pair-2', votedPlayerUuid: 'p2', voterUuid: 'p3', voteType: 'brew' },
          { pairingUuid: 'pair-1', votedPlayerUuid: 'p2', voterUuid: 'p4', voteType: 'play' }
        ]
      }))

      expect(standingOf(result, 'p2')).toMatchObject({
        brewReceived: 3, brewRounds: 2, brewVoters: 2, playReceived: 1, playRounds: 1, playVoters: 1
      })
      expect(standingOf(result, 'p1')).toMatchObject({ brewRounds: 0, playVoters: 0 })
    })
  })

  describe('order', () => {
    it('puts a win ahead of the same score without one', () => {
      // p1 and p2 both end on 6 points, but only p1 won a table: p3 leads on 7
      const result = buildLiveCommanderStandings(input({
        pairings: [
          { uuid: 'pair-1', roundUuid: 'round-1', playerUuids: PLAYERS },
          { uuid: 'pair-2', roundUuid: 'round-2', playerUuids: PLAYERS }
        ],
        results: [
          rank('p1', 1, 'pair-1'), rank('p2', 2, 'pair-1'), rank('p3', 3, 'pair-1'), rank('p4', 4, 'pair-1'),
          rank('p3', 1, 'pair-2'), rank('p2', 2, 'pair-2'), rank('p4', 3, 'pair-2'), rank('p1', 4, 'pair-2')
        ]
      }))

      expect(result.map(item => [item.playerUuid, item.score])).toEqual([
        ['p3', 7], ['p1', 6], ['p2', 6], ['p4', 3]
      ])
      expect(standingOf(result, 'p1').victories).toBe(1)
      expect(standingOf(result, 'p2').victories).toBe(0)
    })

    it('falls back to the player uuid so a tie never flickers', () => {
      const result = buildLiveCommanderStandings(input())

      expect(result.map(item => item.playerUuid)).toEqual(['p1', 'p2', 'p3', 'p4'])
    })
  })
})
