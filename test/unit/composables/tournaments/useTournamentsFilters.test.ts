// test\unit\composables\tournaments\useTournamentsFilters.test.ts
import { ref } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import { useTournamentsFilters } from '~/composables/tournaments/useTournamentsFilters'
import type { Tournament } from '~/types'

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }))

function makeTournament(overrides: Partial<Tournament>): Tournament {
  return {
    uuid: 'x',
    name: 'Torneo',
    status: 'registration_open',
    format: 'Pauper',
    startDate: new Date(2026, 8, 15).toISOString(),
    ...overrides
  } as Tournament
}

describe('useTournamentsFilters', () => {
  const range = ref({ start: new Date(2026, 8, 1), end: new Date(2026, 8, 30) })

  it('filters by status', () => {
    const tournaments = [
      makeTournament({ uuid: 't1', status: 'completed' }),
      makeTournament({ uuid: 't2', status: 'registration_open' })
    ]
    const { statusFilter, filteredTournaments } = useTournamentsFilters(ref(tournaments), range)
    statusFilter.value = 'completed'
    expect(filteredTournaments.value.map(t => t.uuid)).toEqual(['t1'])
  })

  it('filters by format', () => {
    const tournaments = [
      makeTournament({ uuid: 't1', format: 'Draft' }),
      makeTournament({ uuid: 't2', format: 'Pauper' })
    ]
    const { formatFilter, filteredTournaments } = useTournamentsFilters(ref(tournaments), range)
    formatFilter.value = 'Draft'
    expect(filteredTournaments.value.map(t => t.uuid)).toEqual(['t1'])
  })

  it('excludes tournaments outside the date range', () => {
    const tournaments = [
      makeTournament({ uuid: 't1', startDate: new Date(2026, 7, 1).toISOString() }),
      makeTournament({ uuid: 't2', startDate: new Date(2026, 8, 15).toISOString() })
    ]
    const { filteredTournaments } = useTournamentsFilters(ref(tournaments), range)
    expect(filteredTournaments.value.map(t => t.uuid)).toEqual(['t2'])
  })

  it('filters by case-insensitive name search', () => {
    const tournaments = [
      makeTournament({ uuid: 't1', name: 'Pauper Cup' }),
      makeTournament({ uuid: 't2', name: 'Draft Night' })
    ]
    const { filteredTournaments } = useTournamentsFilters(ref(tournaments), range, ref('pauper'))
    expect(filteredTournaments.value.map(t => t.uuid)).toEqual(['t1'])
  })

  it('counts tournaments by status from the unfiltered data', () => {
    const tournaments = [
      makeTournament({ uuid: 't1', status: 'completed' }),
      makeTournament({ uuid: 't2', status: 'completed' }),
      makeTournament({ uuid: 't3', status: 'draft' })
    ]
    const { statusTabs } = useTournamentsFilters(ref(tournaments), range)
    const completedTab = statusTabs.value.find(tab => tab.value === 'completed')
    expect(completedTab?.count).toBe(2)
  })

  it('sorts format tabs alphabetically with counts', () => {
    const tournaments = [
      makeTournament({ uuid: 't1', format: 'Pauper' }),
      makeTournament({ uuid: 't2', format: 'Draft' }),
      makeTournament({ uuid: 't3', format: 'Draft' })
    ]
    const { formatTabs } = useTournamentsFilters(ref(tournaments), range)
    const labels = formatTabs.value.filter(tab => tab.value !== 'all').map(tab => tab.value)
    expect(labels).toEqual(['Draft', 'Pauper'])
    expect(formatTabs.value.find(tab => tab.value === 'Draft')?.count).toBe(2)
  })
})
