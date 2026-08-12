// app\composables\wantedCards\useWantedCardsBulkActions.ts
// Bulk operations over a set of selected cards (useSelection.ts).
// No new bulk server endpoint: each op just fans the existing per-card mutation
// out with Promise.allSettled — simple, and the selection sizes here are small
// (a page of wanted cards), not worth a dedicated bulk endpoint for now.
import type { WantedCard, WantedCardStatus } from '~/types'
import type { Selection } from '~/composables/useSelection'

type PendingBulkAction
  = | { type: 'status', status: WantedCardStatus, cards: WantedCard[] }
    | { type: 'delete', cards: WantedCard[] }

export function useWantedCardsBulkActions(selection: Selection<number>) {
  const { t } = useI18n()
  const toast = useToast()
  const undoable = useUndoableAction()
  const { setStatus, deleteWantedCard, refreshPrices } = useWantedCardsMutations()
  const { copy } = useClipboard()

  // Status changes and deletes are destructive/state-changing enough to warrant
  // a confirmation step (same reasoning as the existing single-card delete
  // confirm in useWantedCardsRowActions.ts) — copy/refresh below skip it, they
  // don't lose or change any request data.
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
      description: failed > 0 ? t('wantedCard.bulkActions.partialFailure', failed) : undefined,
      color: failed > 0 ? 'warning' : 'success'
    })
  }

  // Closes the modal immediately and defers the actual mutation(s) behind a
  // 10-second undo window (useUndoableAction.ts) — the toast shown here
  // replaces the old inline success/failure toast, which now only fires once
  // the window elapses and the mutations actually run (see the `commit`
  // callback below).
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
