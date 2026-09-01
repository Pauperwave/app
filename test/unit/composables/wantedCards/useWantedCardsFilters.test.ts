// test\unit\composables\wantedCards\useWantedCardsFilters.test.ts
import { computed, ref } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import { useWantedCardsFilters } from '~/composables/wantedCards/useWantedCardsFilters'
import type { WantedCard } from '~/types'

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }))

const currentAssociate = ref<{ uuid: string } | null>(null)
vi.mock('~/composables/associates/useCurrentAssociate', () => ({
  useCurrentAssociate: () => computed(() => currentAssociate.value)
}))

function makeCard(overrides: Partial<WantedCard>): WantedCard {
  return {
    id: 1,
    cardName: 'Lightning Bolt',
    status: 'searching',
    typeLine: 'Instant',
    colorIdentity: ['R'],
    playerAssociateUuid: 'p1',
    ...overrides
  } as WantedCard
}

describe('useWantedCardsFilters', () => {
  it('defaults to only showing "searching" cards', () => {
    const cards = [makeCard({ id: 1, status: 'searching' }), makeCard({ id: 2, status: 'found' })]
    const { filteredCards } = useWantedCardsFilters(ref(cards))
    expect(filteredCards.value.map(c => c.id)).toEqual([1])
  })

  it('filters by case-insensitive card name', () => {
    const cards = [makeCard({ id: 1, cardName: 'Counterspell' }), makeCard({ id: 2, cardName: 'Ponder' })]
    const { cardNameFilter, statusFilter, filteredCards } = useWantedCardsFilters(ref(cards))
    statusFilter.value = 'all'
    cardNameFilter.value = 'counter'
    expect(filteredCards.value.map(c => c.id)).toEqual([1])
  })

  it('color filter matches only cards whose full identity is a subset of the selection', () => {
    const cards = [
      makeCard({ id: 1, colorIdentity: ['G'] }),
      makeCard({ id: 2, colorIdentity: ['U'] }),
      makeCard({ id: 3, colorIdentity: ['G', 'U'] }),
      makeCard({ id: 4, colorIdentity: ['G', 'U', 'B'] })
    ]
    const { statusFilter, toggleColorFilter, filteredCards } = useWantedCardsFilters(ref(cards))
    statusFilter.value = 'all'
    toggleColorFilter('G')
    toggleColorFilter('U')
    expect(filteredCards.value.map(c => c.id).sort()).toEqual([1, 2, 3])
  })

  it('land combined with a color narrows to that color of land', () => {
    const cards = [
      makeCard({ id: 1, typeLine: 'Land', colorIdentity: ['G'] }),
      makeCard({ id: 2, typeLine: 'Land', colorIdentity: ['U'] }),
      makeCard({ id: 3, typeLine: 'Creature', colorIdentity: ['G'] })
    ]
    const { statusFilter, toggleColorFilter, filteredCards } = useWantedCardsFilters(ref(cards))
    statusFilter.value = 'all'
    toggleColorFilter('land')
    toggleColorFilter('G')
    expect(filteredCards.value.map(c => c.id)).toEqual([1])
  })

  it('land alone (no color) means any land', () => {
    const cards = [
      makeCard({ id: 1, typeLine: 'Land', colorIdentity: [] }),
      makeCard({ id: 2, typeLine: 'Creature', colorIdentity: [] })
    ]
    const { statusFilter, toggleColorFilter, filteredCards } = useWantedCardsFilters(ref(cards))
    statusFilter.value = 'all'
    toggleColorFilter('land')
    expect(filteredCards.value.map(c => c.id)).toEqual([1])
  })

  it('toggling "all" clears every active color filter', () => {
    const { colorFilters, toggleColorFilter } = useWantedCardsFilters(ref([]))
    toggleColorFilter('G')
    toggleColorFilter('U')
    toggleColorFilter('all')
    expect(colorFilters.value).toEqual([])
  })

  it('onlyMine filters to the current associate\'s own requests', () => {
    currentAssociate.value = { uuid: 'p1' }
    const cards = [
      makeCard({ id: 1, playerAssociateUuid: 'p1' }),
      makeCard({ id: 2, playerAssociateUuid: 'p2' })
    ]
    const { statusFilter, onlyMine, filteredCards } = useWantedCardsFilters(ref(cards))
    statusFilter.value = 'all'
    onlyMine.value = true
    expect(filteredCards.value.map(c => c.id)).toEqual([1])
  })

  it('counts cards by status from the unfiltered data', () => {
    const cards = [
      makeCard({ id: 1, status: 'searching' }),
      makeCard({ id: 2, status: 'searching' }),
      makeCard({ id: 3, status: 'found' })
    ]
    const { statusTabs } = useWantedCardsFilters(ref(cards))
    expect(statusTabs.value.find(tab => tab.value === 'searching')?.count).toBe(2)
  })
})
