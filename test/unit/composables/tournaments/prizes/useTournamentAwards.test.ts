// test\unit\composables\tournaments\prizes\useTournamentAwards.test.ts
import { ref } from 'vue'
import { describe, expect, it } from 'vitest'
import { useTournamentAwards } from '~/composables/tournaments/prizes/useTournamentAwards'
import type { TournamentAwardKind } from '~/composables/tournaments/prizes/useTournamentAwards'
import type { LiveCommanderStanding } from '~/utils/tournaments/liveCommanderStandings'

function makeStanding(overrides: Partial<LiveCommanderStanding>): LiveCommanderStanding {
  return {
    playerUuid: 'p',
    associateUuid: 'a',
    label: 'Player',
    firstName: 'First',
    surname: 'Last',
    score: 0,
    victories: 0,
    kills: 0,
    brewReceived: 0,
    playReceived: 0,
    brewScore: 0,
    playScore: 0,
    roundsPlayed: 3,
    brewRounds: 0,
    playRounds: 0,
    brewVoters: 0,
    playVoters: 0,
    deaths: 0,
    dropped: null,
    ...overrides
  }
}

function awardFor(kind: TournamentAwardKind, standings: LiveCommanderStanding[]) {
  return useTournamentAwards(ref(standings)).value.find(award => award.kind === kind)
}

function rankedUuids(kind: TournamentAwardKind, standings: LiveCommanderStanding[]) {
  return awardFor(kind, standings)?.ranking.map(entry => entry.playerUuid)
}

describe('useTournamentAwards', () => {
  it('omits an award when its stat is 0 for everyone', () => {
    const awards = useTournamentAwards(ref([makeStanding({ playerUuid: 'p1' })])).value

    expect(awards).toEqual([])
  })

  it('ranks everyone above 0 for the stat, best first', () => {
    const killer = awardFor('killer', [
      makeStanding({ playerUuid: 'p1', kills: 1 }),
      makeStanding({ playerUuid: 'p2', kills: 4 }),
      makeStanding({ playerUuid: 'p3', kills: 0 })
    ])

    expect(killer?.ranking.map(entry => [entry.playerUuid, entry.value])).toEqual([
      ['p2', 4],
      ['p1', 1]
    ])
    expect(killer?.winners.map(entry => entry.playerUuid)).toEqual(['p2'])
  })

  it('does not reorder the standings it was given', () => {
    const standings = ref([
      makeStanding({ playerUuid: 'p1', kills: 1 }),
      makeStanding({ playerUuid: 'p2', kills: 4 })
    ])

    const awards = useTournamentAwards(standings)
    expect(awards.value).toHaveLength(1)

    expect(standings.value.map(standing => standing.playerUuid)).toEqual(['p1', 'p2'])
  })

  describe('killer', () => {
    it('breaks a tie by fewer deaths', () => {
      const standings = [
        makeStanding({ playerUuid: 'p1', kills: 3, deaths: 2 }),
        makeStanding({ playerUuid: 'p2', kills: 3, deaths: 0 })
      ]

      expect(rankedUuids('killer', standings)).toEqual(['p2', 'p1'])
    })

    it('then by kills per round played', () => {
      const standings = [
        makeStanding({ playerUuid: 'p1', kills: 3, roundsPlayed: 3 }),
        makeStanding({ playerUuid: 'p2', kills: 3, roundsPlayed: 2 })
      ]

      expect(rankedUuids('killer', standings)).toEqual(['p2', 'p1'])
    })
  })

  describe('victim', () => {
    it('breaks a tie by fewer kills', () => {
      const standings = [
        makeStanding({ playerUuid: 'p1', deaths: 2, kills: 2 }),
        makeStanding({ playerUuid: 'p2', deaths: 2, kills: 0 })
      ]

      expect(rankedUuids('victim', standings)).toEqual(['p2', 'p1'])
    })

    it('then by deaths per round played', () => {
      const standings = [
        makeStanding({ playerUuid: 'p1', deaths: 2, roundsPlayed: 3 }),
        makeStanding({ playerUuid: 'p2', deaths: 2, roundsPlayed: 2 })
      ]

      expect(rankedUuids('victim', standings)).toEqual(['p2', 'p1'])
    })
  })

  describe.each([
    ['brewer', 'brewReceived', 'brewRounds', 'brewVoters'],
    ['player', 'playReceived', 'playRounds', 'playVoters']
  ] as const)('%s', (kind, votes, rounds, voters) => {
    it('breaks a tie by the number of different rounds the votes came from', () => {
      const standings = [
        makeStanding({ playerUuid: 'p1', [votes]: 5, [rounds]: 1, [voters]: 3 }),
        makeStanding({ playerUuid: 'p2', [votes]: 5, [rounds]: 3, [voters]: 3 })
      ]

      expect(rankedUuids(kind, standings)).toEqual(['p2', 'p1'])
    })

    it('then by the number of different voters', () => {
      const standings = [
        makeStanding({ playerUuid: 'p1', [votes]: 5, [rounds]: 2, [voters]: 2 }),
        makeStanding({ playerUuid: 'p2', [votes]: 5, [rounds]: 2, [voters]: 4 })
      ]

      expect(rankedUuids(kind, standings)).toEqual(['p2', 'p1'])
    })

    it('puts more votes ahead of any tiebreak', () => {
      const standings = [
        makeStanding({ playerUuid: 'p1', [votes]: 5, [rounds]: 3, [voters]: 4 }),
        makeStanding({ playerUuid: 'p2', [votes]: 6, [rounds]: 1, [voters]: 1 })
      ]

      expect(rankedUuids(kind, standings)).toEqual(['p2', 'p1'])
    })
  })

  it('shares the first position when every tiebreak is level (ex aequo)', () => {
    const brewer = awardFor('brewer', [
      makeStanding({ playerUuid: 'p1', brewReceived: 5, brewRounds: 2, brewVoters: 3 }),
      makeStanding({ playerUuid: 'p2', brewReceived: 5, brewRounds: 2, brewVoters: 3 }),
      makeStanding({ playerUuid: 'p3', brewReceived: 1, brewRounds: 1, brewVoters: 1 })
    ])

    expect(brewer?.winners.map(entry => entry.playerUuid)).toEqual(['p1', 'p2'])
    expect(brewer?.ranking.map(entry => [entry.position, entry.isTied])).toEqual([
      [1, true],
      [1, true],
      [3, false]
    ])
  })

  it('carries the tiebreak values of each entry, in the order they apply', () => {
    const killer = awardFor('killer', [
      makeStanding({ playerUuid: 'p1', kills: 3, deaths: 1, roundsPlayed: 3 }),
      makeStanding({ playerUuid: 'p2', kills: 3, deaths: 0, roundsPlayed: 2 })
    ])

    expect(killer?.ranking[0]?.tiebreaks).toEqual([
      { id: 'deaths', value: 0 },
      { id: 'killsPerRound', value: 1.5 }
    ])
    expect(killer?.ranking[1]?.tiebreaks).toEqual([
      { id: 'deaths', value: 1 },
      { id: 'killsPerRound', value: 1 }
    ])
  })

  it('shows the real counts for the vote tiebreaks', () => {
    const brewer = awardFor('brewer', [
      makeStanding({ playerUuid: 'p1', brewReceived: 5, brewRounds: 2, brewVoters: 4 })
    ])

    expect(brewer?.ranking[0]?.tiebreaks).toEqual([
      { id: 'rounds', value: 2 },
      { id: 'voters', value: 4 }
    ])
  })

  it('does not use the overall score as a tiebreak', () => {
    const standings = [
      makeStanding({ playerUuid: 'p1', kills: 3, score: 1 }),
      makeStanding({ playerUuid: 'p2', kills: 3, score: 99 })
    ]

    expect(awardFor('killer', standings)?.winners).toHaveLength(2)
  })
})
