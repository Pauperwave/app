// test\unit\composables\tournaments\useTournamentsBulkActions.test.ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useTournamentsBulkActions } from '~/composables/tournaments/useTournamentsBulkActions'
import { useSelection } from '~/composables/useSelection'
import type { Tournament } from '~/types'

const setStatus = { mutateAsync: vi.fn() }
const setImage = { mutateAsync: vi.fn() }
const setEntryFee = { mutateAsync: vi.fn() }
const setLeague = { mutateAsync: vi.fn() }
const deleteTournament = { mutateAsync: vi.fn() }
const toastAdd = vi.fn()

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }))
vi.mock('~/composables/tournaments/useTournamentsMutations', () => ({
  useTournamentsMutations: () => ({ setStatus, setImage, setEntryFee, setLeague, deleteTournament })
}))

function makeTournament(overrides: Partial<Tournament>): Tournament {
  return { id: 1, uuid: 't1', ...overrides } as Tournament
}

function allMutations() {
  return [setStatus, setImage, setEntryFee, setLeague, deleteTournament]
}

describe('useTournamentsBulkActions', () => {
  beforeEach(() => {
    toastAdd.mockClear()
    for (const mutation of allMutations()) {
      mutation.mutateAsync.mockReset().mockResolvedValue(undefined)
    }
    vi.stubGlobal('useToast', () => ({ add: toastAdd }))
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('requestImageChange opens the confirm modal with a pending image action', () => {
    const selection = useSelection<number>()
    const { requestImageChange, pendingAction, confirmOpen } = useTournamentsBulkActions(selection)
    const tournaments = [makeTournament({ id: 1 })]
    requestImageChange({ imageUrl: 'https://x/y.jpg', imageCardName: 'Card', imageCardArtist: 'Artist' }, tournaments)
    expect(confirmOpen.value).toBe(true)
    expect(pendingAction.value).toEqual({
      type: 'image', imageUrl: 'https://x/y.jpg', imageCardName: 'Card', imageCardArtist: 'Artist', tournaments
    })
  })

  it('a status change calls setStatus for every tournament after the undo window', async () => {
    const selection = useSelection<number>()
    const { requestStatusChange, confirmPendingAction } = useTournamentsBulkActions(selection)
    requestStatusChange('cancelled', [makeTournament({ id: 1 }), makeTournament({ id: 2 })])
    confirmPendingAction()
    await vi.advanceTimersByTimeAsync(10000)
    expect(setStatus.mutateAsync).toHaveBeenCalledWith({ id: 1, status: 'cancelled' })
    expect(setStatus.mutateAsync).toHaveBeenCalledWith({ id: 2, status: 'cancelled' })
    expect(toastAdd).toHaveBeenCalledWith(expect.objectContaining({ color: 'success' }))
  })

  it('an image change calls setImage with the new image fields for every tournament', async () => {
    const selection = useSelection<number>()
    const { requestImageChange, confirmPendingAction } = useTournamentsBulkActions(selection)
    requestImageChange(
      { imageUrl: 'https://x/y.jpg', imageCardName: 'Card', imageCardArtist: 'Artist' },
      [makeTournament({ id: 1 })]
    )
    confirmPendingAction()
    await vi.advanceTimersByTimeAsync(10000)
    expect(setImage.mutateAsync).toHaveBeenCalledWith({
      id: 1, imageUrl: 'https://x/y.jpg', imageCardName: 'Card', imageCardArtist: 'Artist'
    })
  })

  it('an entry fee change calls setEntryFee for every tournament', async () => {
    const selection = useSelection<number>()
    const { requestEntryFeeChange, confirmPendingAction } = useTournamentsBulkActions(selection)
    requestEntryFeeChange(15, [makeTournament({ id: 1 })])
    confirmPendingAction()
    await vi.advanceTimersByTimeAsync(10000)
    expect(setEntryFee.mutateAsync).toHaveBeenCalledWith({ id: 1, entryFee: 15 })
  })

  it('a league change calls setLeague for every tournament, unlinking with a null uuid', async () => {
    const selection = useSelection<number>()
    const { requestLeagueChange, confirmPendingAction } = useTournamentsBulkActions(selection)
    requestLeagueChange(null, 'none', [makeTournament({ id: 1 })])
    confirmPendingAction()
    await vi.advanceTimersByTimeAsync(10000)
    expect(setLeague.mutateAsync).toHaveBeenCalledWith({ id: 1, leagueUuid: null })
  })

  it('a delete calls deleteTournament for every tournament', async () => {
    const selection = useSelection<number>()
    const { requestDelete, confirmPendingAction } = useTournamentsBulkActions(selection)
    requestDelete([makeTournament({ id: 1 }), makeTournament({ id: 2 })])
    confirmPendingAction()
    await vi.advanceTimersByTimeAsync(10000)
    expect(deleteTournament.mutateAsync).toHaveBeenCalledWith(1)
    expect(deleteTournament.mutateAsync).toHaveBeenCalledWith(2)
  })

  it('reports partial failure when some mutations reject', async () => {
    setStatus.mutateAsync
      .mockReset()
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('nope'))
    const selection = useSelection<number>()
    const { requestStatusChange, confirmPendingAction } = useTournamentsBulkActions(selection)
    requestStatusChange('completed', [makeTournament({ id: 1 }), makeTournament({ id: 2 })])
    confirmPendingAction()
    await vi.advanceTimersByTimeAsync(10000)
    expect(toastAdd).toHaveBeenCalledWith(expect.objectContaining({ color: 'warning' }))
  })

  it('confirmPendingAction closes the modal and clears the selection synchronously', () => {
    const selection = useSelection<number>()
    selection.toggle(1)
    const {
      requestDelete, confirmPendingAction, confirmOpen, pendingAction
    } = useTournamentsBulkActions(selection)
    requestDelete([makeTournament({ id: 1 })])
    confirmPendingAction()
    expect(confirmOpen.value).toBe(false)
    expect(pendingAction.value).toBeNull()
    expect(selection.selectedIds.value.size).toBe(0)
  })
})
