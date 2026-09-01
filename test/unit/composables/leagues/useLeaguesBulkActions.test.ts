// test\unit\composables\leagues\useLeaguesBulkActions.test.ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useLeaguesBulkActions } from '~/composables/leagues/useLeaguesBulkActions'
import { useSelection } from '~/composables/useSelection'
import type { League } from '~/types'

const setStatus = { mutateAsync: vi.fn() }
const deleteLeague = { mutateAsync: vi.fn() }
const toastAdd = vi.fn()

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }))
vi.mock('~/composables/leagues/useLeaguesMutations', () => ({
  useLeaguesMutations: () => ({ setStatus, deleteLeague })
}))

function makeLeague(overrides: Partial<League>): League {
  return { id: 1, uuid: 'l1', name: 'Lega', ...overrides } as League
}

describe('useLeaguesBulkActions', () => {
  beforeEach(() => {
    toastAdd.mockClear()
    setStatus.mutateAsync.mockReset()
    deleteLeague.mutateAsync.mockReset()
    vi.stubGlobal('useToast', () => ({ add: toastAdd }))
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('requestDelete opens the confirm modal with a pending delete action', () => {
    const selection = useSelection<number>()
    const { requestDelete, pendingAction, confirmOpen } = useLeaguesBulkActions(selection)
    const leagues = [makeLeague({ id: 1 })]
    requestDelete(leagues)
    expect(confirmOpen.value).toBe(true)
    expect(pendingAction.value).toEqual({ type: 'delete', leagues })
  })

  it('confirmPendingAction is a no-op when there is nothing pending', () => {
    const selection = useSelection<number>()
    const { confirmPendingAction, confirmOpen } = useLeaguesBulkActions(selection)
    confirmPendingAction()
    expect(confirmOpen.value).toBe(false)
  })

  it('after the undo window elapses, a status change calls setStatus for every league', async () => {
    setStatus.mutateAsync.mockResolvedValue(undefined)
    const selection = useSelection<number>()
    const { requestStatusChange, confirmPendingAction } = useLeaguesBulkActions(selection)
    const leagues = [makeLeague({ id: 1 }), makeLeague({ id: 2 })]
    requestStatusChange('completed', leagues)
    confirmPendingAction()

    await vi.advanceTimersByTimeAsync(10000)

    expect(setStatus.mutateAsync).toHaveBeenCalledWith({ id: 1, status: 'completed' })
    expect(setStatus.mutateAsync).toHaveBeenCalledWith({ id: 2, status: 'completed' })
    expect(toastAdd).toHaveBeenCalledWith(expect.objectContaining({ color: 'success' }))
  })

  it('after the undo window elapses, a delete calls deleteLeague for every league', async () => {
    deleteLeague.mutateAsync.mockResolvedValue(undefined)
    const selection = useSelection<number>()
    const { requestDelete, confirmPendingAction } = useLeaguesBulkActions(selection)
    requestDelete([makeLeague({ id: 1 })])
    confirmPendingAction()

    await vi.advanceTimersByTimeAsync(10000)

    expect(deleteLeague.mutateAsync).toHaveBeenCalledWith(1)
    expect(toastAdd).toHaveBeenCalledWith(expect.objectContaining({ color: 'success' }))
  })
})
