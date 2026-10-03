// app\composables\transactions\useTransactionsBulkActions.ts
// Bulk delete over the selected transactions (useSelection.ts), like
// useTournamentsBulkActions.ts/useWantedCardsBulkActions.ts but with no undo window: a payment is a
// financial record (see useTransactionsRowActions.ts's confirmDelete), so this awaits the mutation
// instead of useUndoableAction.ts
import type { NewTransactionPayload, PaymentType } from '#shared/types/transactions'
import type { Transaction } from '~/types'

// Full-payload PATCH: update.post.ts takes the whole NewTransactionPayload (not a partial) and
// reconciles pauperwave_associate_renewals from it, so a bulk field change resends every other
// field unchanged. Unlike EditModal.vue's mapping it preserves the row's real eventUuid instead of
// nulling it (that is a simplification of the form, which has no widget for it)
function transactionToPayload(
  transaction: Transaction, overrides: Partial<NewTransactionPayload> = {}
): NewTransactionPayload {
  return {
    associateUuid: transaction.associate_uuid,
    payerName: transaction.payer_name,
    payerSurname: transaction.payer_surname,
    payerEmail: transaction.payer_email,
    payerTaxCode: transaction.payer_tax_code,
    paymentDate: transaction.payment_date,
    paymentAmount: transaction.payment_amount,
    paymentMethod: transaction.payment_method,
    paymentType: transaction.payment_type,
    receivedBy: transaction.received_by,
    tournamentUuid: transaction.tournament_uuid,
    eventUuid: transaction.event_uuid,
    eventName: transaction.event_name,
    notes: transaction.notes,
    ...overrides
  }
}

type PendingBulkAction
  = | { type: 'delete', transactions: Transaction[] }
    | { type: 'paymentType', paymentType: PaymentType, transactions: Transaction[] }

export function useTransactionsBulkActions() {
  const { t } = useI18n()
  const toast = useToast()
  const { deleteTransaction, updateTransaction } = useTransactionsMutations()

  // Every bulk action mutates a financial record: no undo window, await behind an explicit confirm
  // (like confirmDelete in useTransactionsRowActions.ts), extended to payment-type changes since
  // they can also flip a pauperwave_associate_renewals row server-side (update.post.ts)
  const pendingAction = ref<PendingBulkAction | null>(null)
  const confirmOpen = ref(false)
  const processing = ref(false)

  function requestBulkDelete(transactions: Transaction[]) {
    pendingAction.value = { type: 'delete', transactions }
    confirmOpen.value = true
  }

  function requestBulkTypeChange(paymentType: PaymentType, transactions: Transaction[]) {
    pendingAction.value = { type: 'paymentType', paymentType, transactions }
    confirmOpen.value = true
  }

  function toastForFailures(succeeded: number, failed: number, successTitle: string) {
    toast.add({
      title: successTitle,
      description: failed > 0 ? t('transaction.bulkActions.partialFailure', failed) : undefined,
      color: failed > 0 ? 'warning' : 'success'
    })
  }

  async function confirmPendingAction() {
    const action = pendingAction.value
    if (!action) return

    processing.value = true
    try {
      if (action.type === 'delete') {
        const results = await Promise.allSettled(
          action.transactions.map(transaction => deleteTransaction.mutateAsync(transaction.id))
        )
        const failed = results.filter(result => result.status === 'rejected').length
        toastForFailures(
          results.length - failed, failed,
          t('transaction.bulkActions.deleteSuccessToast', results.length - failed)
        )
      } else {
        const results = await Promise.allSettled(
          action.transactions.map(transaction => updateTransaction.mutateAsync({
            id: transaction.id,
            edits: transactionToPayload(transaction, { paymentType: action.paymentType })
          }))
        )
        const failed = results.filter(result => result.status === 'rejected').length
        toastForFailures(
          results.length - failed, failed,
          t('transaction.bulkActions.typeChangeSuccessToast', results.length - failed)
        )
      }

      confirmOpen.value = false
      pendingAction.value = null
    } finally {
      processing.value = false
    }
  }

  return {
    pendingAction,
    confirmOpen,
    processing,
    requestBulkDelete,
    requestBulkTypeChange,
    confirmPendingAction
  }
}
