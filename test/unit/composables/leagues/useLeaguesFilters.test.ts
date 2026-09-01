// test\unit\composables\leagues\useLeaguesFilters.test.ts
import { ref } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import { useLeaguesFilters } from '~/composables/leagues/useLeaguesFilters'
import type { League } from '~/types'

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }))

function makeLeague(overrides: Partial<League>): League {
  return { uuid: 'x', name: 'Lega', status: 'active', ...overrides } as League
}

describe('useLeaguesFilters', () => {
  it('filters by status', () => {
    const leagues = [
      makeLeague({ uuid: 'l1', status: 'completed' }),
      makeLeague({ uuid: 'l2', status: 'active' })
    ]
    const { statusFilter, filteredLeagues } = useLeaguesFilters(ref(leagues), ref(''))
    statusFilter.value = 'completed'
    expect(filteredLeagues.value.map(l => l.uuid)).toEqual(['l1'])
  })

  it('filters by case-insensitive name search', () => {
    const leagues = [
      makeLeague({ uuid: 'l1', name: 'Lega Pauper' }),
      makeLeague({ uuid: 'l2', name: 'Lega Draft' })
    ]
    const { filteredLeagues } = useLeaguesFilters(ref(leagues), ref('pauper'))
    expect(filteredLeagues.value.map(l => l.uuid)).toEqual(['l1'])
  })

  it('counts leagues by status from the unfiltered data', () => {
    const leagues = [
      makeLeague({ uuid: 'l1', status: 'draft' }),
      makeLeague({ uuid: 'l2', status: 'draft' }),
      makeLeague({ uuid: 'l3', status: 'active' })
    ]
    const { statusTabs } = useLeaguesFilters(ref(leagues), ref(''))
    expect(statusTabs.value.find(tab => tab.value === 'draft')?.count).toBe(2)
  })
})
