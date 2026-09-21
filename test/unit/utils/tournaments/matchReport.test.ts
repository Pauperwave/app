// test\unit\utils\tournaments\matchReport.test.ts
import { describe, expect, it } from 'vitest'
import {
  gamesFromOutcome, MATCH_OUTCOMES, reportBlockReason, respondBlockReason, scoreLabelFor,
  type PendingReport
} from '#shared/utils/tournaments/matchReport'

const pending: PendingReport = { reporterUuid: 'a', status: 'pending' }

describe('reportBlockReason', () => {
  const base = { pairingStatus: 'pending', isParticipant: true, report: null }

  it('lets a participant report an open match', () => {
    expect(reportBlockReason(base)).toBeNull()
  })

  it('rejects someone who is not at the table', () => {
    expect(reportBlockReason({ ...base, isParticipant: false })).toBe('not-a-player')
  })

  it('rejects a match that already has its result', () => {
    expect(reportBlockReason({ ...base, pairingStatus: 'completed' })).toBe('match-completed')
  })

  it('rejects a second report, pending or disputed', () => {
    expect(reportBlockReason({ ...base, report: pending })).toBe('already-reported')
    expect(reportBlockReason({ ...base, report: { ...pending, status: 'disputed' } })).toBe('already-reported')
  })
})

describe('respondBlockReason', () => {
  const base = { pairingStatus: 'pending', isParticipant: true, responderUuid: 'b', report: pending }

  it('lets the opponent answer a pending report', () => {
    expect(respondBlockReason(base)).toBeNull()
  })

  it('never lets the reporter answer their own report', () => {
    expect(respondBlockReason({ ...base, responderUuid: 'a' })).toBe('own-report')
  })

  it('rejects someone who is not at the table', () => {
    expect(respondBlockReason({ ...base, isParticipant: false })).toBe('not-a-player')
  })

  it('rejects when there is nothing to answer', () => {
    expect(respondBlockReason({ ...base, report: null })).toBe('no-report')
  })

  it('rejects once the match has its result', () => {
    expect(respondBlockReason({ ...base, pairingStatus: 'completed' })).toBe('match-completed')
  })

  it('rejects a report that is already disputed', () => {
    expect(respondBlockReason({ ...base, report: { ...pending, status: 'disputed' } })).toBe('already-disputed')
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
