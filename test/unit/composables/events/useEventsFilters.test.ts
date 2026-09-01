// test\unit\composables\events\useEventsFilters.test.ts
import { ref } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import { useEventsFilters } from '~/composables/events/useEventsFilters'
import type { Event } from '~/types'

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }))

function makeEvent(overrides: Partial<Event>): Event {
  return {
    uuid: 'x',
    name: 'Evento',
    status: 'published',
    startDate: new Date(2026, 8, 15).toISOString(),
    ...overrides
  } as Event
}

describe('useEventsFilters', () => {
  const range = ref({ start: new Date(2026, 8, 1), end: new Date(2026, 8, 30) })

  it('filters by status', () => {
    const events = [
      makeEvent({ uuid: 'e1', status: 'cancelled' }),
      makeEvent({ uuid: 'e2', status: 'published' })
    ]
    const { statusFilter, filteredEvents } = useEventsFilters(ref(events), range, ref(''))
    statusFilter.value = 'cancelled'
    expect(filteredEvents.value.map(e => e.uuid)).toEqual(['e1'])
  })

  it('excludes events outside the date range', () => {
    const events = [
      makeEvent({ uuid: 'e1', startDate: new Date(2026, 6, 1).toISOString() }),
      makeEvent({ uuid: 'e2', startDate: new Date(2026, 8, 15).toISOString() })
    ]
    const { filteredEvents } = useEventsFilters(ref(events), range, ref(''))
    expect(filteredEvents.value.map(e => e.uuid)).toEqual(['e2'])
  })

  it('filters by case-insensitive name search', () => {
    const events = [
      makeEvent({ uuid: 'e1', name: 'Commanderwave Fest' }),
      makeEvent({ uuid: 'e2', name: 'Draft Night' })
    ]
    const { filteredEvents } = useEventsFilters(ref(events), range, ref('commanderwave'))
    expect(filteredEvents.value.map(e => e.uuid)).toEqual(['e1'])
  })

  it('counts events by status from the unfiltered data', () => {
    const events = [
      makeEvent({ uuid: 'e1', status: 'ongoing' }),
      makeEvent({ uuid: 'e2', status: 'ongoing' }),
      makeEvent({ uuid: 'e3', status: 'draft' })
    ]
    const { statusTabs } = useEventsFilters(ref(events), range, ref(''))
    expect(statusTabs.value.find(tab => tab.value === 'ongoing')?.count).toBe(2)
  })
})
