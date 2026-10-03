// app\composables\leagues\useLeaguesBulkActions.ts
// Bulk operations over a set of selected leagues (useSelection.ts), like
// useTournamentsBulkActions.ts: no bulk server endpoint, each op fans the per-league mutation out
// with Promise.allSettled. fallow-ignore-file code-duplication -- same shape as
// useTournamentsBulkActions.ts, but entity/status types, i18n prefix and mutations differ per
// domain: a shared factory would need as many parameters as it removes
import type { League, LeagueStatus } from '~/types'
import type { Selection } from '~/composables/useSelection'

type PendingBulkAction
  = | { type: 'status', status: LeagueStatus, leagues: League[] }
    | { type: 'delete', leagues: League[] }

export function useLeaguesBulkActions(selection: Selection<number>) {
  const { t } = useI18n()
  const toast = useToast()
  const undoable = useUndoableAction()
  const { setStatus, deleteLeague } = useLeaguesMutations()

  // Both actions are destructive/state-changing enough to warrant a
  // confirmation step, same reasoning as useTournamentsBulkActions.ts.
  const pendingAction = ref<PendingBulkAction | null>(null)
  const confirmOpen = ref(false)

  function requestStatusChange(status: LeagueStatus, leagues: League[]) {
    pendingAction.value = { type: 'status', status, leagues }
    confirmOpen.value = true
  }

  function requestDelete(leagues: League[]) {
    pendingAction.value = { type: 'delete', leagues }
    confirmOpen.value = true
  }

  function toastForFailures(succeeded: number, failed: number, successTitle: string) {
    toast.add({
      title: successTitle,
      // fallow-ignore-next-line code-duplication -- same undo flow as the sibling
      description: failed > 0 ? t('league.bulkActions.partialFailure', failed) : undefined,
      color: failed > 0 ? 'warning' : 'success'
    })
  }

  // Closes the modal at once and defers the mutation(s) behind a 10-second undo window
  // (useUndoableAction.ts), like useTournamentsBulkActions.ts
  function confirmPendingAction() {
    const action = pendingAction.value
    if (!action) return

    confirmOpen.value = false
    pendingAction.value = null
    selection.clear()

    undoable.run({
      title: action.type === 'delete'
        ? t('league.bulkActions.deleteUndoToast', action.leagues.length)
        : t('league.bulkActions.statusUndoToast', {
          status: t(`league.status.${action.status}`)
        }, action.leagues.length),
      commit: async () => {
        const results = await Promise.allSettled(
          action.leagues.map(league => action.type === 'status'
            ? setStatus.mutateAsync({ id: league.id, status: action.status })
            : deleteLeague.mutateAsync(league.id))
        )
        const failed = results.filter(result => result.status === 'rejected').length

        toastForFailures(
          results.length - failed,
          failed,
          action.type === 'status'
            ? t('league.bulkActions.statusSuccessToast', results.length - failed)
            : t('league.bulkActions.deleteSuccessToast', results.length - failed)
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
