// app\composables\leagues\useLeaguesBulkActions.ts
// Bulk operations over a set of selected leagues (useSelection.ts) — same
// shape as useTournamentsBulkActions.ts: no dedicated bulk server endpoint,
// each op fans the existing per-league mutation out with Promise.allSettled.
// fallow-ignore-file code-duplication -- requestStatusChange/requestDelete/
// toastForFailures mirror useTournamentsBulkActions.ts's shape, but the
// entity/status types, i18n key prefix, and mutation functions all differ
// per domain — same same-shaped-but-parameterized call as
// feedback_dedup_threshold_call_sites; a shared factory would need as many
// parameters as it removes duplication.
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
      description: failed > 0 ? t('league.bulkActions.partialFailure', failed) : undefined,
      color: failed > 0 ? 'warning' : 'success'
    })
  }

  // Closes the modal immediately and defers the actual mutation(s) behind a
  // 10-second undo window (useUndoableAction.ts), same as
  // useTournamentsBulkActions.ts.
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
