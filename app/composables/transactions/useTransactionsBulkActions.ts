// app\composables\transactions\useTransactionsBulkActions.ts
// Bulk delete over a set of selected transactions (useSelection.ts) — same
// shape as useTournamentsBulkActions.ts/useWantedCardsBulkActions.ts, except
// no undo window: useTransactionsRowActions.ts's own single-row confirmDelete
// already deliberately skips it ("a payment is a financial record, not
// something to silently commit a few seconds after the confirm click") — the
// same reasoning applies here, so this awaits the mutation directly instead
// of going through useUndoableAction.ts.
import type { Transaction } from '~/types'

export function useTransactionsBulkActions() {
  const { t } = useI18n()
  const toast = useToast()
  const { deleteTransaction } = useTransactionsMutations()

  const pendingDelete = shallowRef<Transaction[] | null>(null)
  const confirmOpen = ref(false)
  const deleting = ref(false)

  function requestBulkDelete(transactions: Transaction[]) {
    pendingDelete.value = transactions
    confirmOpen.value = true
  }

  async function confirmBulkDelete() {
    const transactions = pendingDelete.value
    if (!transactions) return

    deleting.value = true
    try {
      const results = await Promise.allSettled(
        transactions.map(transaction => deleteTransaction.mutateAsync(transaction.id))
      )
      const failed = results.filter(result => result.status === 'rejected').length

      toast.add({
        title: t('transaction.bulkActions.deleteSuccessToast', results.length - failed),
        description: failed > 0 ? t('transaction.bulkActions.partialFailure', failed) : undefined,
        color: failed > 0 ? 'warning' : 'success'
      })

      confirmOpen.value = false
      pendingDelete.value = null
    } finally {
      deleting.value = false
    }
  }

  return {
    pendingDelete, confirmOpen, deleting, requestBulkDelete, confirmBulkDelete
  }
}
