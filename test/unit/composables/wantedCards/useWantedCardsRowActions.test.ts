// test\unit\composables\wantedCards\useWantedCardsRowActions.test.ts
import { computed, ref } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useWantedCardsRowActions } from '~/composables/wantedCards/useWantedCardsRowActions'
import type { WantedCard } from '~/types'

const setStatus = { mutateAsync: vi.fn() }
const deleteWantedCard = { mutateAsync: vi.fn() }
const refreshPrices = { mutateAsync: vi.fn() }
const toastAdd = vi.fn()
const isStaff = ref(true)
const currentAssociate = ref<{ uuid: string } | null>(null)

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }))
vi.mock('~/composables/wantedCards/useWantedCardsMutations', () => ({
  useWantedCardsMutations: () => ({ setStatus, deleteWantedCard, refreshPrices })
}))
vi.mock('~/composables/useUserRole', () => ({
  useUserRole: () => ({ isStaff })
}))
vi.mock('~/composables/associates/useCurrentAssociate', () => ({
  useCurrentAssociate: () => computed(() => currentAssociate.value)
}))

function makeCard(overrides: Partial<WantedCard>): WantedCard {
  return {
    id: 1,
    cardName: 'Lightning Bolt',
    status: 'searching',
    scryfallUrl: 'https://scryfall.com/card/x',
    scryfallId: 'abc',
    setCode: 'lea',
    ...overrides
  } as WantedCard
}

describe('useWantedCardsRowActions', () => {
  beforeEach(() => {
    toastAdd.mockClear()
    setStatus.mutateAsync.mockReset()
    isStaff.value = true
    currentAssociate.value = null
    vi.stubGlobal('useToast', () => ({ add: toastAdd }))
  })

  it('offers a "mark as" item for every status except the card\'s current one', () => {
    const { rowContextMenuItems } = useWantedCardsRowActions()
    const items = rowContextMenuItems(makeCard({ status: 'searching' }))
    const markAsLabels = items
      .filter(item => 'label' in item && item.label.startsWith('wantedCard.contextMenu.markAs.'))
      .map(item => 'label' in item && item.label)
    expect(markAsLabels).toEqual([
      'wantedCard.contextMenu.markAs.found',
      'wantedCard.contextMenu.markAs.abandoned'
    ])
  })

  it('disables "view on Scryfall" when the card has no scryfallUrl', () => {
    const { rowContextMenuItems } = useWantedCardsRowActions()
    const items = rowContextMenuItems(makeCard({ scryfallUrl: '' }))
    const item = items.find(i => 'label' in i && i.label === 'wantedCard.contextMenu.viewOnScryfall')
    expect(item && 'disabled' in item ? item.disabled : undefined).toBe(true)
  })

  it('disables "refresh prices" when scryfallId or setCode is missing', () => {
    const { rowContextMenuItems } = useWantedCardsRowActions()
    const items = rowContextMenuItems(makeCard({ scryfallId: null }))
    const item = items.find(i => 'label' in i && i.label === 'wantedCard.contextMenu.refreshPrices')
    expect(item && 'disabled' in item ? item.disabled : undefined).toBe(true)
  })

  it('enables "refresh prices" when both scryfallId and setCode are present', () => {
    const { rowContextMenuItems } = useWantedCardsRowActions()
    const items = rowContextMenuItems(makeCard({}))
    const item = items.find(i => 'label' in i && i.label === 'wantedCard.contextMenu.refreshPrices')
    expect(item && 'disabled' in item ? item.disabled : undefined).toBe(false)
  })

  it('changeStatus calls setStatus with the new status', async () => {
    setStatus.mutateAsync.mockResolvedValue(undefined)
    const { rowContextMenuItems } = useWantedCardsRowActions()
    const items = rowContextMenuItems(makeCard({ status: 'searching' }))
    const foundItem = items.find(i => 'label' in i && i.label === 'wantedCard.contextMenu.markAs.found')
    await (foundItem && 'onSelect' in foundItem ? foundItem.onSelect?.(new Event('select')) : undefined)
    expect(setStatus.mutateAsync).toHaveBeenCalledWith({ id: 1, status: 'found' })
  })

  it('changeStatus toasts an error when the mutation fails', async () => {
    setStatus.mutateAsync.mockRejectedValue(new Error('nope'))
    const { rowContextMenuItems } = useWantedCardsRowActions()
    const items = rowContextMenuItems(makeCard({ status: 'searching' }))
    const foundItem = items.find(i => 'label' in i && i.label === 'wantedCard.contextMenu.markAs.found')
    await (foundItem && 'onSelect' in foundItem ? foundItem.onSelect?.(new Event('select')) : undefined)
    expect(toastAdd).toHaveBeenCalledWith(expect.objectContaining({ color: 'error' }))
  })

  it('openDeleteConfirm sets the pending card and opens the confirm modal', () => {
    const { openDeleteConfirm, deletingCard, deleteConfirmOpen } = useWantedCardsRowActions()
    const card = makeCard({ id: 9 })
    openDeleteConfirm(card)
    expect(deletingCard.value).toEqual(card)
    expect(deleteConfirmOpen.value).toBe(true)
  })

  describe('canManage (ADR-033: management OR the request\'s own owner)', () => {
    it('hides status-change and delete for a viewer who is neither staff nor the owner', () => {
      isStaff.value = false
      currentAssociate.value = { uuid: 'other-associate' }
      const { rowContextMenuItems } = useWantedCardsRowActions()
      const items = rowContextMenuItems(makeCard({ playerAssociateUuid: 'card-owner' }))
      const labels = items.filter(i => 'label' in i).map(i => 'label' in i && i.label)
      expect(labels).not.toContain('wantedCard.contextMenu.markAs.found')
      expect(labels).not.toContain('wantedCard.contextMenu.delete')
    })

    it('offers status-change and delete to the request\'s own owner even when not staff', () => {
      isStaff.value = false
      currentAssociate.value = { uuid: 'card-owner' }
      const { rowContextMenuItems } = useWantedCardsRowActions()
      const items = rowContextMenuItems(makeCard({ playerAssociateUuid: 'card-owner' }))
      const labels = items.filter(i => 'label' in i).map(i => 'label' in i && i.label)
      expect(labels).toContain('wantedCard.contextMenu.markAs.found')
      expect(labels).toContain('wantedCard.contextMenu.delete')
    })

    it('keeps edit and refresh-prices management-only regardless of ownership', () => {
      isStaff.value = false
      currentAssociate.value = { uuid: 'card-owner' }
      const { rowContextMenuItems } = useWantedCardsRowActions()
      const items = rowContextMenuItems(makeCard({ playerAssociateUuid: 'card-owner' }))
      const editItem = items.find(i => 'label' in i && i.label === 'wantedCard.contextMenu.edit')
      expect(editItem && 'disabled' in editItem ? editItem.disabled : undefined).toBe(true)
    })
  })
})
