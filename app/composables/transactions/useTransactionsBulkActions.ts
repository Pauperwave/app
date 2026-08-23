// app\composables\transactions\useTransactionsBulkActions.ts
// Bulk delete over a set of selected transactions (useSelection.ts) — same
// shape as useTournamentsBulkActions.ts/useWantedCardsBulkActions.ts, except
// no undo window: useTransactionsRowActions.ts's own single-row confirmDelete
// already deliberately skips it ("a payment is a financial record, not
// something to silently commit a few seconds after the confirm click") — the
// same reasoning applies here, so this awaits the mutation directly instead
// of going through useUndoableAction.ts.
import type { NewTransactionPayload, PaymentType } from '#shared/types/transactions'
import type { Transaction } from '~/types'

// Full-payload PATCH: update.post.ts (like the single-row EditModal.vue it
// was built for) takes the whole NewTransactionPayload, not a partial patch,
// and reconciles pauperwave_associate_renewals off of it — so a bulk field
// change still has to resend every other field unchanged. Unlike
// EditModal.vue's own mapping this preserves the row's real eventUuid
// instead of hardcoding null: that null-out is a known simplification of the
// form (no widget for it there), not something worth reproducing here where
// the value's already on hand.
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

  // Every bulk action here mutates a financial record — same "no undo
  // window, await the mutation behind an explicit confirm" reasoning as the
  // single-row confirmDelete in useTransactionsRowActions.ts, extended to
  // payment-type changes since those can also flip a
  // pauperwave_associate_renewals row server-side (update.post.ts).
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
