// test\unit\utils\tournaments\tournamentStageLabel.test.ts
import { describe, expect, it } from 'vitest'
import { assignTournamentStageNumbers, tournamentStageText } from '~/utils/tournaments/tournamentStageLabel'
import type { Tournament } from '~/types'

function makeTournament(overrides: Partial<Tournament>): Tournament {
  return {
    id: 1,
    uuid: 't1',
    leagueUuid: null,
    startDate: '2026-01-01T00:00:00.000Z',
    status: 'scheduled',
    stageNumber: undefined,
    ...overrides
  } as Tournament
}

describe('assignTournamentStageNumbers', () => {
  it('leaves tournaments with no league untouched', () => {
    const tournaments = [makeTournament({ uuid: 't1', leagueUuid: null })]
    assignTournamentStageNumbers(tournaments)
    expect(tournaments[0]?.stageNumber).toBeUndefined()
  })

  it('numbers tournaments within a league in chronological order', () => {
    const tournaments = [
      makeTournament({ uuid: 't2', leagueUuid: 'l1', startDate: '2026-02-01T00:00:00.000Z' }),
      makeTournament({ uuid: 't1', leagueUuid: 'l1', startDate: '2026-01-01T00:00:00.000Z' }),
      makeTournament({ uuid: 't3', leagueUuid: 'l1', startDate: '2026-03-01T00:00:00.000Z' })
    ]
    assignTournamentStageNumbers(tournaments)
    expect(tournaments.find(t => t.uuid === 't1')?.stageNumber).toBe(1)
    expect(tournaments.find(t => t.uuid === 't2')?.stageNumber).toBe(2)
    expect(tournaments.find(t => t.uuid === 't3')?.stageNumber).toBe(3)
  })

  it('numbers independently, per league', () => {
    const tournaments = [
      makeTournament({ uuid: 'a1', leagueUuid: 'la', startDate: '2026-01-01T00:00:00.000Z' }),
      makeTournament({ uuid: 'b1', leagueUuid: 'lb', startDate: '2026-01-01T00:00:00.000Z' }),
      makeTournament({ uuid: 'a2', leagueUuid: 'la', startDate: '2026-02-01T00:00:00.000Z' })
    ]
    assignTournamentStageNumbers(tournaments)
    expect(tournaments.find(t => t.uuid === 'a1')?.stageNumber).toBe(1)
    expect(tournaments.find(t => t.uuid === 'a2')?.stageNumber).toBe(2)
    expect(tournaments.find(t => t.uuid === 'b1')?.stageNumber).toBe(1)
  })

  it('skips cancelled stages entirely, both numbering them and counting them', () => {
    const tournaments = [
      makeTournament({
        uuid: 't1', leagueUuid: 'l1', startDate: '2026-01-01T00:00:00.000Z', status: 'cancelled'
      }),
      makeTournament({ uuid: 't2', leagueUuid: 'l1', startDate: '2026-02-01T00:00:00.000Z' }),
      makeTournament({ uuid: 't3', leagueUuid: 'l1', startDate: '2026-03-01T00:00:00.000Z' })
    ]
    assignTournamentStageNumbers(tournaments)
    expect(tournaments.find(t => t.uuid === 't1')?.stageNumber).toBeUndefined()
    expect(tournaments.find(t => t.uuid === 't2')?.stageNumber).toBe(1)
    expect(tournaments.find(t => t.uuid === 't3')?.stageNumber).toBe(2)
  })
})

describe('tournamentStageText', () => {
  it('renders the ordinal stage label when a stage number is assigned', () => {
    expect(tournamentStageText(makeTournament({ stageNumber: 3 }))).toBe(' — 3ª tappa')
  })

  it('renders nothing when there is no stage number', () => {
    expect(tournamentStageText(makeTournament({ stageNumber: undefined }))).toBe('')
  })
})
