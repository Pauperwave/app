// app\composables\associates\useAssociatesBulkActions.ts
// Bulk "Rinnova" for the roster's row selection: the same confirm+undo shape as
// useTournamentsBulkActions.ts/useWantedCardsBulkActions.ts, but each renewal is a real payment
// (createTransaction), one Association Fee transaction per associate, like the single-row "Rinnova"
// (openRenewModal).
//
// received_by has no "current logged-in user" default (RECEIVER_OPTIONS is a hardcoded board-member
// list, see useTransactionFormOptions.ts) and every transaction needs one, so the confirm step asks
// for it.
import type { Associate } from '~/types'
import type { Selection } from '~/composables/useSelection'

export function useAssociatesBulkActions(selection: Selection<number>) {
  const { t } = useI18n()
  const toast = useToast()
  const undoable = useUndoableAction()
  const { createTransaction } = useTransactionsMutations()
  const { receiverOptions } = useTransactionFormOptions()
  // Admin-editable membership fee (/settings) — was a hardcoded constant
  // until migration 20260819100000.
  const settings = useSettingsQuery()

  // shallowRef, not ref (like useAssociatesRowActions.ts's contextMenuRow): Associate's optional
  // AvatarProps field makes Vue's UnwrapRef blow up TS (TS2589)
  const pendingRenewal = shallowRef<Associate[] | null>(null)
  const confirmOpen = ref(false)
  const receivedBy = ref<string | undefined>(undefined)

  function requestBulkRenew(associates: Associate[]) {
    pendingRenewal.value = associates
    receivedBy.value = undefined
    confirmOpen.value = true
  }

  // Closes the modal at once and defers the transaction creation behind a 10-second undo window
  // (useUndoableAction.ts), like the other bulk-action composables
  function confirmBulkRenew() {
    const associates = pendingRenewal.value
    const receiver = receivedBy.value
    const fee = settings.data.value
    if (!associates || !receiver || !fee) return

    confirmOpen.value = false
    pendingRenewal.value = null
    selection.clear()

    undoable.run({
      title: t('associate.bulkActions.renewUndoToast', associates.length),
      commit: async () => {
        const results = await Promise.allSettled(associates.map(associate =>
          createTransaction.mutateAsync({
            associateUuid: associate.uuid,
            payerName: null,
            payerSurname: null,
            payerEmail: null,
            payerTaxCode: null,
            paymentDate: new Date().toISOString(),
            paymentAmount: fee.membershipFeeAmount,
            paymentMethod: fee.membershipFeePaymentMethod,
            paymentType: 'Association Fee',
            receivedBy: receiver,
            tournamentUuid: null,
            eventUuid: null,
            eventName: null,
            notes: ''
          })))

        const failed = results.filter(result => result.status === 'rejected').length
        toast.add({
          title: t('associate.bulkActions.renewSuccessToast', results.length - failed),
          description: failed > 0 ? t('associate.bulkActions.partialFailure', failed) : undefined,
          color: failed > 0 ? 'warning' : 'success'
        })
      }
    })
  }

  // Top-level ref (not settings.data itself) so index.vue's template binds it directly: a nested
  // `.data` on a plain object isn't auto-unwrapped in templates
  const feeReady = computed(() => !!settings.data.value)

  return {
    pendingRenewal, confirmOpen, receivedBy, receiverOptions, feeReady,
    requestBulkRenew, confirmBulkRenew
  }
}
