// test\unit\utils\tournaments\matchReport.test.ts
import { describe, expect, it } from 'vitest'
import {
  gamesFromOutcome, MATCH_OUTCOMES, reportBlockReason, respondBlockReason, scoreLabelFor,
  type ReportedResult
} from '#shared/utils/tournaments/matchReport'

const unanswered: ReportedResult = { reporterUuid: 'a', confirmedAt: null, disputedAt: null }

describe('reportBlockReason', () => {
  const base = { pairingStatus: 'pending', isParticipant: true }

  it('lets a participant report an open match', () => {
    expect(reportBlockReason(base)).toBeNull()
  })

  it('rejects someone who is not at the table', () => {
    expect(reportBlockReason({ ...base, isParticipant: false })).toBe('not-a-player')
  })

  it('rejects a match that already has its result', () => {
    expect(reportBlockReason({ ...base, pairingStatus: 'completed' })).toBe('match-completed')
  })
})

describe('respondBlockReason', () => {
  const base = { isParticipant: true, responderUuid: 'b', result: unanswered }

  it('lets the opponent answer an unanswered result', () => {
    expect(respondBlockReason(base)).toBeNull()
  })

  it('never lets the reporter answer their own report', () => {
    expect(respondBlockReason({ ...base, responderUuid: 'a' })).toBe('own-report')
  })

  it('rejects someone who is not at the table', () => {
    expect(respondBlockReason({ ...base, isParticipant: false })).toBe('not-a-player')
  })

  it('rejects when there is nothing to answer', () => {
    expect(respondBlockReason({ ...base, result: null })).toBe('no-report')
  })

  it('rejects a result already confirmed', () => {
    expect(respondBlockReason({ ...base, result: { ...unanswered, confirmedAt: '2026-09-24T10:00:00Z' } }))
      .toBe('already-confirmed')
  })

  it('rejects a result already disputed', () => {
    expect(respondBlockReason({ ...base, result: { ...unanswered, disputedAt: '2026-09-24T10:00:00Z' } }))
      .toBe('already-disputed')
  })
})

describe('gamesFromOutcome', () => {
  const win21 = MATCH_OUTCOMES[1]!

  it('keeps the reporter score first when they are player 1', () => {
    expect(gamesFromOutcome(win21, true)).toEqual({ player1GamesWon: 2, player2GamesWon: 1 })
  })

  it('swaps the score when the reporter is player 2', () => {
    expect(gamesFromOutcome(win21, false)).toEqual({ player1GamesWon: 1, player2GamesWon: 2 })
  })

  it('only offers scores the database accepts', () => {
    const valid = new Set(['2-0', '2-1', '1-1', '1-2', '0-2'])
    expect(MATCH_OUTCOMES.map(outcome => outcome.label).every(label => valid.has(label))).toBe(true)
    expect(MATCH_OUTCOMES).toHaveLength(valid.size)
  })
})

describe('scoreLabelFor', () => {
  const games = { player1GamesWon: 2, player2GamesWon: 1 }

  it('shows the viewer games first', () => {
    expect(scoreLabelFor(games, true)).toBe('2-1')
    expect(scoreLabelFor(games, false)).toBe('1-2')
  })
})
