// app\composables\tournaments\useTournamentsBulkActions.ts
// Bulk operations over a set of selected tournaments (useSelection.ts) — same
// shape as useWantedCardsBulkActions.ts: no dedicated bulk server endpoint,
// each op fans the existing per-tournament mutation out with Promise.allSettled.
// fallow-ignore-file code-duplication -- requestStatusChange/requestDelete/
// toastForFailures mirror useWantedCardsBulkActions.ts's shape, but the
// entity/status types, i18n key prefix, and mutation functions all differ
// per domain (wanted-cards also has two extra bulk actions this domain
// doesn't need) — same same-shaped-but-parameterized call as
// feedback_dedup_threshold_call_sites; a shared factory would need as many
// parameters as it removes duplication.
import type { Tournament, TournamentStatus } from '~/types'
import type { Selection } from '~/composables/useSelection'

interface ImageChange {
  imageUrl: string
  imageCardName: string | null
  imageCardArtist: string | null
}

type PendingBulkAction
  = | { type: 'status', status: TournamentStatus, tournaments: Tournament[] }
    | ({ type: 'image', tournaments: Tournament[] } & ImageChange)
    | { type: 'entryFee', entryFee: number, tournaments: Tournament[] }
    | { type: 'league', leagueUuid: string | null, leagueName: string, tournaments: Tournament[] }
    | { type: 'delete', tournaments: Tournament[] }

export function useTournamentsBulkActions(selection: Selection<number>) {
  const { t } = useI18n()
  const toast = useToast()

  const undoable = useUndoableAction()
  const {
    setStatus, setImage, setEntryFee, setLeague, deleteTournament
  } = useTournamentsMutations()

  // Every action is destructive/state-changing enough to warrant a
  // confirmation step, same reasoning as useWantedCardsBulkActions.ts.
  const pendingAction = ref<PendingBulkAction | null>(null)
  const confirmOpen = ref(false)

  function requestStatusChange(status: TournamentStatus, tournaments: Tournament[]) {
    pendingAction.value = { type: 'status', status, tournaments }
    confirmOpen.value = true
  }

  function requestImageChange(change: ImageChange, tournaments: Tournament[]) {
    pendingAction.value = { type: 'image', ...change, tournaments }
    confirmOpen.value = true
  }

  function requestEntryFeeChange(entryFee: number, tournaments: Tournament[]) {
    pendingAction.value = { type: 'entryFee', entryFee, tournaments }
    confirmOpen.value = true
  }

  function requestLeagueChange(
    leagueUuid: string | null, leagueName: string, tournaments: Tournament[]
  ) {
    pendingAction.value = { type: 'league', leagueUuid, leagueName, tournaments }
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
      title: undoToastTitle(action),
      commit: async () => {
        const results = await Promise.allSettled(
          action.tournaments.map((tournament) => {
            if (action.type === 'status') {
              return setStatus.mutateAsync({ id: tournament.id, status: action.status })
            }
            if (action.type === 'image') {
              return setImage.mutateAsync({
                id: tournament.id,
                imageUrl: action.imageUrl,
                imageCardName: action.imageCardName,
                imageCardArtist: action.imageCardArtist
              })
            }
            if (action.type === 'entryFee') {
              return setEntryFee.mutateAsync({ id: tournament.id, entryFee: action.entryFee })
            }
            if (action.type === 'league') {
              return setLeague.mutateAsync({ id: tournament.id, leagueUuid: action.leagueUuid })
            }
            return deleteTournament.mutateAsync(tournament.id)
          })
        )
        const failed = results.filter(result => result.status === 'rejected').length
        const succeeded = results.length - failed

        toastForFailures(succeeded, failed, successToastTitle(action, succeeded))
      }
    })
  }

  function undoToastTitle(action: PendingBulkAction) {
    if (action.type === 'delete') {
      return t('tournament.bulkActions.deleteUndoToast', action.tournaments.length)
    }
    if (action.type === 'image') {
      return t('tournament.bulkActions.imageUndoToast', action.tournaments.length)
    }
    if (action.type === 'entryFee') {
      return t('tournament.bulkActions.entryFeeUndoToast', action.tournaments.length)
    }
    if (action.type === 'league') {
      return t('tournament.bulkActions.leagueUndoToast', {
        league: action.leagueName
      }, action.tournaments.length)
    }
    return t('tournament.bulkActions.statusUndoToast', {
      status: t(`tournament.status.${action.status}`)
    }, action.tournaments.length)
  }

  function successToastTitle(action: PendingBulkAction, count: number) {
    if (action.type === 'delete') {
      return t('tournament.bulkActions.deleteSuccessToast', count)
    }
    if (action.type === 'image') {
      return t('tournament.bulkActions.imageSuccessToast', count)
    }
    if (action.type === 'entryFee') {
      return t('tournament.bulkActions.entryFeeSuccessToast', count)
    }
    if (action.type === 'league') {
      return t('tournament.bulkActions.leagueSuccessToast', count)
    }
    return t('tournament.bulkActions.statusSuccessToast', count)
  }

  return {
    pendingAction,
    confirmOpen,
    requestStatusChange,
    requestImageChange,
    requestEntryFeeChange,
    requestLeagueChange,
    requestDelete,
    confirmPendingAction
  }
}
