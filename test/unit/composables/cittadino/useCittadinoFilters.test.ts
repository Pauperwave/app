// test\unit\composables\cittadino\useCittadinoFilters.test.ts
import { ref } from 'vue'
import { describe, expect, it } from 'vitest'
import { useCittadinoFilters } from '~/composables/cittadino/useCittadinoFilters'
import type { CittadinoEvent, CittadinoPlacement } from '~/types'

function makeEvent(overrides: Partial<CittadinoEvent>): CittadinoEvent {
  return { uuid: 'e1', format: 'Pauper', ...overrides } as CittadinoEvent
}

function makePlacement(overrides: Partial<CittadinoPlacement>): CittadinoPlacement {
  return { playerUuid: 'p1', playerName: 'Alice', eventUuid: 'e1', rank: 1, ...overrides } as CittadinoPlacement
}

describe('useCittadinoFilters', () => {
  it('is unfiltered by default, listing every distinct format', () => {
    const events = ref([makeEvent({ uuid: 'e1', format: 'Pauper' }), makeEvent({ uuid: 'e2', format: 'Draft' })])
    const { formats, isFiltered, filteredEvents } = useCittadinoFilters(events, ref([]))
    expect(formats.value).toEqual(['Pauper', 'Draft'])
    expect(isFiltered.value).toBe(false)
    expect(filteredEvents.value).toHaveLength(2)
  })

  it('filters events down to the selected formats', () => {
    const events = ref([makeEvent({ uuid: 'e1', format: 'Pauper' }), makeEvent({ uuid: 'e2', format: 'Draft' })])
    const { selectedFormats, isFiltered, filteredEvents } = useCittadinoFilters(events, ref([]))
    selectedFormats.value = ['Pauper']
    expect(isFiltered.value).toBe(true)
    expect(filteredEvents.value.map(e => e.uuid)).toEqual(['e1'])
  })

  it('selecting every format counts as unfiltered', () => {
    const events = ref([makeEvent({ uuid: 'e1', format: 'Pauper' }), makeEvent({ uuid: 'e2', format: 'Draft' })])
    const { selectedFormats, isFiltered } = useCittadinoFilters(events, ref([]))
    selectedFormats.value = ['Pauper', 'Draft']
    expect(isFiltered.value).toBe(false)
  })

  it('computes standings only from placements in the filtered events', () => {
    const events = ref([makeEvent({ uuid: 'e1', format: 'Pauper' }), makeEvent({ uuid: 'e2', format: 'Draft' })])
    const placements = ref([
      makePlacement({ playerUuid: 'p1', eventUuid: 'e1', rank: 1 }),
      makePlacement({ playerUuid: 'p1', eventUuid: 'e2', rank: 1 })
    ])
    const { selectedFormats, standings } = useCittadinoFilters(events, placements)
    selectedFormats.value = ['Pauper']
    expect(standings.value).toHaveLength(1)
    expect(standings.value[0]!.eventsPlayed).toBe(1)
  })

  it('ranks standings by total, then best single result, then events played', () => {
    const events = ref([makeEvent({ uuid: 'e1' }), makeEvent({ uuid: 'e2' })])
    const placements = ref([
      makePlacement({ playerUuid: 'p1', playerName: 'Alice', eventUuid: 'e1', rank: 2 }),
      makePlacement({ playerUuid: 'p2', playerName: 'Bob', eventUuid: 'e1', rank: 1 })
    ])
    const { standings } = useCittadinoFilters(events, placements)
    expect(standings.value[0]!.playerName).toBe('Bob')
    expect(standings.value[0]!.position).toBe(1)
    expect(standings.value[1]!.playerName).toBe('Alice')
    expect(standings.value[1]!.position).toBe(2)
  })
})
