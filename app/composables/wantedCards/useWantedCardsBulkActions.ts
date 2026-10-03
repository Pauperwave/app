// app\composables\wantedCards\useWantedCardsBulkActions.ts
// Bulk operations over a set of selected cards (useSelection.ts). No bulk server endpoint: each op
// fans the per-card mutation out with Promise.allSettled (selection sizes are small, a page of
// wanted cards). fallow-ignore-file code-duplication -- see useTournamentsBulkActions.ts
import type { WantedCard, WantedCardStatus } from '~/types'
import type { Selection } from '~/composables/useSelection'

export type PendingBulkAction
  = | { type: 'status', status: WantedCardStatus, cards: WantedCard[] }
    | { type: 'delete', cards: WantedCard[] }

export function useWantedCardsBulkActions(selection: Selection<number>) {
  const { t } = useI18n()
  const toast = useToast()
  const undoable = useUndoableAction()
  const { setStatus, deleteWantedCard, refreshPrices } = useWantedCardsMutations()
  const { copy } = useClipboard()

  // Status changes and deletes are destructive enough to warrant a confirmation (like the
  // single-card delete in useWantedCardsRowActions.ts); copy/refresh skip it, they change no
  // request data
  const pendingAction = ref<PendingBulkAction | null>(null)
  const confirmOpen = ref(false)

  function requestStatusChange(status: WantedCardStatus, cards: WantedCard[]) {
    pendingAction.value = { type: 'status', status, cards }
    confirmOpen.value = true
  }

  function requestDelete(cards: WantedCard[]) {
    pendingAction.value = { type: 'delete', cards }
    confirmOpen.value = true
  }

  function toastForFailures(succeeded: number, failed: number, successTitle: string) {
    toast.add({
      title: successTitle,
      // fallow-ignore-next-line code-duplication -- same undo flow as the sibling
      description: failed > 0 ? t('wantedCard.bulkActions.partialFailure', failed) : undefined,
      color: failed > 0 ? 'warning' : 'success'
    })
  }

  // Closes the modal at once and defers the mutation(s) behind a 10-second undo window
  // (useUndoableAction.ts): the toast replaces the inline success/failure toast, which only fires
  // once the window elapses and the mutations run (see `commit` below)
  function confirmPendingAction() {
    const action = pendingAction.value
    if (!action) return

    confirmOpen.value = false
    pendingAction.value = null
    selection.clear()

    undoable.run({
      title: action.type === 'delete'
        ? t('wantedCard.bulkActions.deleteUndoToast', action.cards.length)
        : t('wantedCard.bulkActions.statusUndoToast', {
          status: t(`wantedCard.status.${action.status}`)
        }, action.cards.length),
      commit: async () => {
        const results = await Promise.allSettled(
          action.cards.map(card => action.type === 'status'
            ? setStatus.mutateAsync({ id: card.id, status: action.status })
            : deleteWantedCard.mutateAsync(card.id))
        )
        const failed = results.filter(result => result.status === 'rejected').length

        toastForFailures(
          results.length - failed,
          failed,
          action.type === 'status'
            ? t('wantedCard.bulkActions.statusSuccessToast', results.length - failed)
            : t('wantedCard.bulkActions.deleteSuccessToast', results.length - failed)
        )
      }
    })
  }

  async function bulkRefreshPrices(cards: WantedCard[]) {
    const eligible = cards.filter(card => card.scryfallId && card.setCode)
    if (!eligible.length) return

    selection.clear()

    const results = await Promise.allSettled(
      eligible.map(card => refreshPrices.mutateAsync(card.id))
    )
    const failed = results.filter(result => result.status === 'rejected').length
    toastForFailures(
      results.length - failed,
      failed,
      t('wantedCard.bulkActions.refreshSuccessToast', results.length - failed)
    )
  }

  async function bulkCopyNames(cards: WantedCard[]) {
    await copy(cards.map(card => card.cardName).join('\n'))
    selection.clear()
    toast.add({ title: t('wantedCard.bulkActions.copiedToast', cards.length), color: 'success' })
  }

  return {
    pendingAction,
    confirmOpen,
    requestStatusChange,
    requestDelete,
    confirmPendingAction,
    bulkRefreshPrices,
    bulkCopyNames
  }
}
