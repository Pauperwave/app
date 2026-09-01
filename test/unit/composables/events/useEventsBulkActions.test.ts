// test\unit\composables\events\useEventsBulkActions.test.ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useEventsBulkActions } from '~/composables/events/useEventsBulkActions'
import { useSelection } from '~/composables/useSelection'
import type { Event } from '~/types'

const setStatus = { mutateAsync: vi.fn() }
const deleteEvent = { mutateAsync: vi.fn() }
const toastAdd = vi.fn()

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }))
vi.mock('~/composables/events/useEventsMutations', () => ({
  useEventsMutations: () => ({ setStatus, deleteEvent })
}))

function makeEvent(overrides: Partial<Event>): Event {
  return { id: 1, uuid: 'e1', name: 'Evento', ...overrides } as Event
}

describe('useEventsBulkActions', () => {
  beforeEach(() => {
    toastAdd.mockClear()
    setStatus.mutateAsync.mockReset()
    deleteEvent.mutateAsync.mockReset()
    vi.stubGlobal('useToast', () => ({ add: toastAdd }))
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('requestStatusChange opens the confirm modal with a pending status action', () => {
    const selection = useSelection<number>()
    const { requestStatusChange, pendingAction, confirmOpen } = useEventsBulkActions(selection)
    const events = [makeEvent({ id: 1 })]
    requestStatusChange('cancelled', events)
    expect(confirmOpen.value).toBe(true)
    expect(pendingAction.value).toEqual({ type: 'status', status: 'cancelled', events })
  })

  it('confirmPendingAction closes the modal and clears the selection immediately', () => {
    const selection = useSelection<number>()
    selection.toggle(1)
    const {
      requestDelete, confirmPendingAction, confirmOpen, pendingAction
    } = useEventsBulkActions(selection)
    requestDelete([makeEvent({ id: 1 })])
    confirmPendingAction()
    expect(confirmOpen.value).toBe(false)
    expect(pendingAction.value).toBeNull()
    expect(selection.selectedIds.value.size).toBe(0)
  })

  it('after the undo window elapses, a status change calls setStatus for every event', async () => {
    setStatus.mutateAsync.mockResolvedValue(undefined)
    const selection = useSelection<number>()
    const { requestStatusChange, confirmPendingAction } = useEventsBulkActions(selection)
    const events = [makeEvent({ id: 1 }), makeEvent({ id: 2 })]
    requestStatusChange('ongoing', events)
    confirmPendingAction()

    await vi.advanceTimersByTimeAsync(10000)

    expect(setStatus.mutateAsync).toHaveBeenCalledWith({ id: 1, status: 'ongoing' })
    expect(setStatus.mutateAsync).toHaveBeenCalledWith({ id: 2, status: 'ongoing' })
    expect(toastAdd).toHaveBeenCalledWith(expect.objectContaining({ color: 'success' }))
  })

  it('after the undo window elapses, a delete calls deleteEvent and reports partial failure', async () => {
    deleteEvent.mutateAsync
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('nope'))
    const selection = useSelection<number>()
    const { requestDelete, confirmPendingAction } = useEventsBulkActions(selection)
    requestDelete([makeEvent({ id: 1 }), makeEvent({ id: 2 })])
    confirmPendingAction()

    await vi.advanceTimersByTimeAsync(10000)

    expect(deleteEvent.mutateAsync).toHaveBeenCalledTimes(2)
    expect(toastAdd).toHaveBeenCalledWith(expect.objectContaining({ color: 'warning' }))
  })
})
