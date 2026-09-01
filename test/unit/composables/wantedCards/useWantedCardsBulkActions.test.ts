// test\unit\composables\wantedCards\useWantedCardsBulkActions.test.ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useWantedCardsBulkActions } from '~/composables/wantedCards/useWantedCardsBulkActions'
import { useSelection } from '~/composables/useSelection'
import type { WantedCard } from '~/types'

const setStatus = { mutateAsync: vi.fn() }
const deleteWantedCard = { mutateAsync: vi.fn() }
const refreshPrices = { mutateAsync: vi.fn() }
const toastAdd = vi.fn()
const clipboardCopy = vi.fn().mockResolvedValue(undefined)

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }))
vi.mock('~/composables/wantedCards/useWantedCardsMutations', () => ({
  useWantedCardsMutations: () => ({ setStatus, deleteWantedCard, refreshPrices })
}))
// happy-dom implements neither the Clipboard API's writeText nor the legacy
// document.execCommand fallback @vueuse/core's useClipboard needs — mock the
// whole module (preserving every other export) rather than fighting the DOM.
vi.mock('@vueuse/core', async importOriginal => ({
  ...(await importOriginal<typeof import('@vueuse/core')>()),
  useClipboard: () => ({ copy: clipboardCopy })
}))

function makeCard(overrides: Partial<WantedCard>): WantedCard {
  return { id: 1, cardName: 'Lightning Bolt', scryfallId: 'abc', setCode: 'lea', ...overrides } as WantedCard
}

describe('useWantedCardsBulkActions', () => {
  beforeEach(() => {
    toastAdd.mockClear()
    setStatus.mutateAsync.mockReset()
    deleteWantedCard.mutateAsync.mockReset()
    refreshPrices.mutateAsync.mockReset()
    vi.stubGlobal('useToast', () => ({ add: toastAdd }))
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('requestStatusChange opens the confirm modal with a pending status action', () => {
    const selection = useSelection<number>()
    const { requestStatusChange, pendingAction, confirmOpen } = useWantedCardsBulkActions(selection)
    const cards = [makeCard({ id: 1 })]
    requestStatusChange('found', cards)
    expect(confirmOpen.value).toBe(true)
    expect(pendingAction.value).toEqual({ type: 'status', status: 'found', cards })
  })

  it('after the undo window elapses, a status change calls setStatus for every card', async () => {
    setStatus.mutateAsync.mockResolvedValue(undefined)
    const selection = useSelection<number>()
    const { requestStatusChange, confirmPendingAction } = useWantedCardsBulkActions(selection)
    requestStatusChange('abandoned', [makeCard({ id: 1 }), makeCard({ id: 2 })])
    confirmPendingAction()

    await vi.advanceTimersByTimeAsync(10000)

    expect(setStatus.mutateAsync).toHaveBeenCalledWith({ id: 1, status: 'abandoned' })
    expect(setStatus.mutateAsync).toHaveBeenCalledWith({ id: 2, status: 'abandoned' })
    expect(toastAdd).toHaveBeenCalledWith(expect.objectContaining({ color: 'success' }))
  })

  it('after the undo window elapses, a delete calls deleteWantedCard for every card', async () => {
    deleteWantedCard.mutateAsync.mockResolvedValue(undefined)
    const selection = useSelection<number>()
    const { requestDelete, confirmPendingAction } = useWantedCardsBulkActions(selection)
    requestDelete([makeCard({ id: 1 })])
    confirmPendingAction()

    await vi.advanceTimersByTimeAsync(10000)

    expect(deleteWantedCard.mutateAsync).toHaveBeenCalledWith(1)
  })

  it('bulkRefreshPrices skips cards missing scryfallId/setCode and clears the selection', async () => {
    refreshPrices.mutateAsync.mockResolvedValue(undefined)
    const selection = useSelection<number>()
    selection.toggle(1)
    const { bulkRefreshPrices } = useWantedCardsBulkActions(selection)
    await bulkRefreshPrices([
      makeCard({ id: 1, scryfallId: 'abc', setCode: 'lea' }),
      makeCard({ id: 2, scryfallId: null })
    ])
    expect(refreshPrices.mutateAsync).toHaveBeenCalledTimes(1)
    expect(refreshPrices.mutateAsync).toHaveBeenCalledWith(1)
    expect(selection.selectedIds.value.size).toBe(0)
  })

  it('bulkRefreshPrices does nothing when no card is eligible', async () => {
    const selection = useSelection<number>()
    const { bulkRefreshPrices } = useWantedCardsBulkActions(selection)
    await bulkRefreshPrices([makeCard({ id: 1, scryfallId: null })])
    expect(refreshPrices.mutateAsync).not.toHaveBeenCalled()
    expect(toastAdd).not.toHaveBeenCalled()
  })

  it('bulkCopyNames joins card names with newlines, clears the selection, and toasts', async () => {
    const selection = useSelection<number>()
    selection.toggle(1)
    const { bulkCopyNames } = useWantedCardsBulkActions(selection)
    await bulkCopyNames([makeCard({ cardName: 'Lightning Bolt' }), makeCard({ cardName: 'Counterspell' })])
    expect(clipboardCopy).toHaveBeenCalledWith('Lightning Bolt\nCounterspell')
    expect(selection.selectedIds.value.size).toBe(0)
    expect(toastAdd).toHaveBeenCalledWith(expect.objectContaining({ color: 'success' }))
  })
})
