// test\unit\utils\tournaments\commanderScoring.test.ts
import { describe, expect, it } from 'vitest'
import {
  buildPosValues, calculatePlayerTableScore, isDrawTable,
  type CommanderTableResult, type RulesetPointValues
} from '#shared/utils/tournaments/commanderScoring'

const RULESET: RulesetPointValues = {
  rank1: 8, rank2: 5, rank3: 3, rank4: 1, kill: 1, brew: 1, play: 1
}

function makeResult(overrides: Partial<CommanderTableResult>): CommanderTableResult {
  return {
    playerUuid: 'p1',
    position: null,
    numberOfKills: 0,
    brewVotesReceived: 0,
    playVotesReceived: 0,
    ...overrides
  }
}

describe('buildPosValues', () => {
  it('prepends a 0 slot for "no rank" ahead of rank1..rank4', () => {
    expect(buildPosValues(RULESET)).toEqual([0, 8, 5, 3, 1])
  })
})

describe('calculatePlayerTableScore', () => {
  const posValues = buildPosValues(RULESET)

  it('returns null when the player has no result at this table', () => {
    const results = [makeResult({ playerUuid: 'other', position: 1 })]
    expect(calculatePlayerTableScore('p1', results, posValues, RULESET)).toBeNull()
  })

  it('returns null when the player has no position submitted yet', () => {
    const results = [makeResult({ playerUuid: 'p1', position: null })]
    expect(calculatePlayerTableScore('p1', results, posValues, RULESET)).toBeNull()
  })

  it('scores an outright 1st place normally', () => {
    const results = [
      makeResult({ playerUuid: 'p1', position: 1 }),
      makeResult({ playerUuid: 'p2', position: 2 }),
      makeResult({ playerUuid: 'p3', position: 3 }),
      makeResult({ playerUuid: 'p4', position: 4 })
    ]
    const score = calculatePlayerTableScore('p1', results, posValues, RULESET)
    expect(score?.scoreRank).toBe(8)
    expect(score?.totalScore).toBe(8)
  })

  it('splits a 2-way tie for 1st into the average of rank1/rank2', () => {
    const results = [
      makeResult({ playerUuid: 'p1', position: 1 }),
      makeResult({ playerUuid: 'p2', position: 1 }),
      makeResult({ playerUuid: 'p3', position: 3 }),
      makeResult({ playerUuid: 'p4', position: 4 })
    ]
    // (rank1 + rank2) / 2 = (8 + 5) / 2 = 6.5, floored to 6
    const score = calculatePlayerTableScore('p1', results, posValues, RULESET)
    expect(score?.scoreRank).toBe(6)
  })

  it('scores a dense 1,1,2,3 the same as its skip-rank 1,1,3,4 equivalent', () => {
    const dense = [
      makeResult({ playerUuid: 'p3', position: 2 }),
      makeResult({ playerUuid: 'p1', position: 1 }),
      makeResult({ playerUuid: 'p2', position: 1 }),
      makeResult({ playerUuid: 'p4', position: 3 })
    ]
    // p3 is dense-ranked 2nd, but two players already occupy rank1/rank2 slots
    // above them -- effective position is 3rd (rank3 = 3 points).
    const score = calculatePlayerTableScore('p3', dense, posValues, RULESET)
    expect(score?.scoreRank).toBe(3)
  })

  it('adds kill/brew/play scores on top of the rank score', () => {
    const results = [
      makeResult({
        playerUuid: 'p1', position: 1, numberOfKills: 2, brewVotesReceived: 1, playVotesReceived: 3
      })
    ]
    const score = calculatePlayerTableScore('p1', results, posValues, RULESET)
    expect(score).toMatchObject({
      killScore: 2, brewScore: 1, playScore: 3, totalScore: 8 + 2 + 1 + 3
    })
  })

  it('clamps an effective position beyond rank4 to the rank4 value', () => {
    const results = [
      makeResult({ playerUuid: 'p1', position: 1 }),
      makeResult({ playerUuid: 'p2', position: 2 }),
      makeResult({ playerUuid: 'p3', position: 3 }),
      makeResult({ playerUuid: 'p4', position: 4 }),
      makeResult({ playerUuid: 'p5', position: 5 })
    ]
    const score = calculatePlayerTableScore('p5', results, posValues, RULESET)
    expect(score?.scoreRank).toBe(1)
  })
})

describe('isDrawTable', () => {
  it('is a draw when everyone is tied for 1st with zero kills', () => {
    const results = [
      makeResult({ playerUuid: 'p1', position: 1, numberOfKills: 0 }),
      makeResult({ playerUuid: 'p2', position: 1, numberOfKills: 0 })
    ]
    expect(isDrawTable(results)).toBe(true)
  })

  it('is not a draw when a kill was recorded', () => {
    const results = [
      makeResult({ playerUuid: 'p1', position: 1, numberOfKills: 1 }),
      makeResult({ playerUuid: 'p2', position: 1, numberOfKills: 0 })
    ]
    expect(isDrawTable(results)).toBe(false)
  })

  it('is not a draw when someone placed below 1st', () => {
    const results = [
      makeResult({ playerUuid: 'p1', position: 1, numberOfKills: 0 }),
      makeResult({ playerUuid: 'p2', position: 2, numberOfKills: 0 })
    ]
    expect(isDrawTable(results)).toBe(false)
  })

  it('is not a draw for an empty table', () => {
    expect(isDrawTable([])).toBe(false)
  })
})
