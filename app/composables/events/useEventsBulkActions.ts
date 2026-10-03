// app\composables\events\useEventsBulkActions.ts
// Bulk operations over a set of selected events (useSelection.ts), like useLeaguesBulkActions.ts:
// no bulk server endpoint, each op fans the per-event mutation out with Promise.allSettled.
// fallow-ignore-file code-duplication -- same shape as useLeaguesBulkActions.ts, but entity/status
// types, i18n prefix and mutations differ per domain: a shared factory would need as many
// parameters as it removes
import type { Event, EventStatus } from '~/types'
import type { Selection } from '~/composables/useSelection'

type PendingBulkAction
  = | { type: 'status', status: EventStatus, events: Event[] }
    | { type: 'delete', events: Event[] }

export function useEventsBulkActions(selection: Selection<number>) {
  const { t } = useI18n()
  const toast = useToast()
  const undoable = useUndoableAction()
  const { setStatus, deleteEvent } = useEventsMutations()

  // Both actions are destructive/state-changing enough to warrant a confirmation, like
  // useLeaguesBulkActions.ts
  const pendingAction = ref<PendingBulkAction | null>(null)
  const confirmOpen = ref(false)

  function requestStatusChange(status: EventStatus, events: Event[]) {
    pendingAction.value = { type: 'status', status, events }
    confirmOpen.value = true
  }

  function requestDelete(events: Event[]) {
    pendingAction.value = { type: 'delete', events }
    confirmOpen.value = true
  }

  function toastForFailures(succeeded: number, failed: number, successTitle: string) {
    toast.add({
      title: successTitle,
      description: failed > 0 ? t('event.bulkActions.partialFailure', failed) : undefined,
      color: failed > 0 ? 'warning' : 'success'
    })
  }

  // Closes the modal at once and defers the mutation(s) behind a 10-second undo window
  // (useUndoableAction.ts), like useLeaguesBulkActions.ts
  function confirmPendingAction() {
    const action = pendingAction.value
    if (!action) return

    confirmOpen.value = false
    pendingAction.value = null
    selection.clear()

    undoable.run({
      title: action.type === 'delete'
        ? t('event.bulkActions.deleteUndoToast', action.events.length)
        : t('event.bulkActions.statusUndoToast', {
          status: t(`event.status.${action.status}`)
        }, action.events.length),
      commit: async () => {
        const results = await Promise.allSettled(
          action.events.map(item => action.type === 'status'
            ? setStatus.mutateAsync({ id: item.id, status: action.status })
            : deleteEvent.mutateAsync(item.id))
        )
        const failed = results.filter(result => result.status === 'rejected').length

        toastForFailures(
          results.length - failed,
          failed,
          action.type === 'status'
            ? t('event.bulkActions.statusSuccessToast', results.length - failed)
            : t('event.bulkActions.deleteSuccessToast', results.length - failed)
        )
      }
    })
  }

  return {
    pendingAction,
    confirmOpen,
    requestStatusChange,
    requestDelete,
    confirmPendingAction
  }
}
