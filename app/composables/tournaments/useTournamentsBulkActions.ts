// app\composables\tournaments\useTournamentsBulkActions.ts
// Bulk operations over a set of selected tournaments (useSelection.ts) — same
// shape as useWantedCardsBulkActions.ts: no dedicated bulk server endpoint,
// each op fans the existing per-tournament mutation out with Promise.allSettled.
import type { Tournament, TournamentStatus } from '~/types'
import type { Selection } from '~/composables/useSelection'

type PendingBulkAction
  = | { type: 'status', status: TournamentStatus, tournaments: Tournament[] }
    | { type: 'delete', tournaments: Tournament[] }

// fallow-ignore-next-line code-duplication -- requestStatusChange/
// requestDelete/toastForFailures mirror useWantedCardsBulkActions.ts's
// shape, but the entity/status types, i18n key prefix, and mutation
// functions all differ per domain (wanted-cards also has two extra bulk
// actions this domain doesn't need) — same same-shaped-but-parameterized
// call as feedback_dedup_threshold_call_sites; a shared factory would need
// as many parameters as it removes duplication.
export function useTournamentsBulkActions(selection: Selection<number>) {
  const { t } = useI18n()
  const toast = useToast()
  const undoable = useUndoableAction()
  const { setStatus, deleteTournament } = useTournamentsMutations()

  // Both actions are destructive/state-changing enough to warrant a
  // confirmation step, same reasoning as useWantedCardsBulkActions.ts.
  const pendingAction = ref<PendingBulkAction | null>(null)
  const confirmOpen = ref(false)

  function requestStatusChange(status: TournamentStatus, tournaments: Tournament[]) {
    pendingAction.value = { type: 'status', status, tournaments }
    confirmOpen.value = true
  }

  function requestDelete(tournaments: Tournament[]) {
    pendingAction.value = { type: 'delete', tournaments }
    confirmOpen.value = true
  }

  function toastForFailures(succeeded: number, failed: number, successTitle: string) {
    toast.add({
      title: successTitle,
      description: failed > 0 ? t('tournament.bulkActions.partialFailure', failed) : undefined,
      color: failed > 0 ? 'warning' : 'success'
    })
  }

  // Closes the modal immediately and defers the actual mutation(s) behind a
  // 10-second undo window (useUndoableAction.ts), same as
  // useWantedCardsBulkActions.ts.
  function confirmPendingAction() {
    const action = pendingAction.value
    if (!action) return

    confirmOpen.value = false
    pendingAction.value = null
    selection.clear()

    undoable.run({
      title: action.type === 'delete'
        ? t('tournament.bulkActions.deleteUndoToast', action.tournaments.length)
        : t('tournament.bulkActions.statusUndoToast', {
          status: t(`tournament.status.${action.status}`)
        }, action.tournaments.length),
      commit: async () => {
        const results = await Promise.allSettled(
          action.tournaments.map(tournament => action.type === 'status'
            ? setStatus.mutateAsync({ id: tournament.id, status: action.status })
            : deleteTournament.mutateAsync(tournament.id))
        )
        const failed = results.filter(result => result.status === 'rejected').length

        toastForFailures(
          results.length - failed,
          failed,
          action.type === 'status'
            ? t('tournament.bulkActions.statusSuccessToast', results.length - failed)
            : t('tournament.bulkActions.deleteSuccessToast', results.length - failed)
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
