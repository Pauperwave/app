// app\composables\tournaments\registration\useAcceptancePickerPayments.ts
// Payment-method tracking for AcceptancePicker.vue's "Iscritti (Pagato)" table, extracted with
// useWalkInPlayers.ts. The rest of the component's dual-table selection/search/remove-confirm logic
// is genuinely intertwined across both tables, so it stays there on purpose.
import type { PaymentMethod } from '#shared/types/transactions'
import { useStorage } from '@vueuse/core'
import type { AcceptancePickerItem } from '~/components/tournaments/single/AcceptancePicker.vue'

export function useAcceptancePickerPayments(options: {
  tournamentUuid: MaybeRefOrGetter<string>
}) {
  const { tournamentUuid } = options
  const { t } = useI18n()
  const toast = useToast()

  const { data: paymentsData } = useTournamentPaymentsQuery(tournamentUuid)
  const { setPayment } = useTournamentRegistrationsMutations(tournamentUuid)

  const paymentMethodByPlayer = reactive<Record<string, PaymentMethod | null>>({})
  watch(paymentsData, (payments) => {
    for (const key of Object.keys(paymentMethodByPlayer)) {
      Reflect.deleteProperty(paymentMethodByPlayer, key)
    }
    for (const payment of payments ?? []) {
      paymentMethodByPlayer[payment.associateUuid] = payment.paymentMethod
    }
  }, { immediate: true })

  // "Test" payment button: marks a player as paid for testing without writing a pauperwave_payments
  // row. Kept out of paymentMethodByPlayer ('test' isn't a PaymentMethod, ck_payment_method would
  // reject it) and persisted to localStorage via VueUse's useStorage so it survives a reload, keyed
  // per tournament so marks don't collide
  const testPayments = useStorage<Record<string, boolean>>(
    () => `tournament-test-payments-${toValue(tournamentUuid)}`, {}
  )

  // Who's running the check-in desk: required to record a *new* payment (received_by is NOT NULL,
  // with no "current user" default, as in useAssociatesBulkActions.ts). Chosen once per session
  // from RECEIVER_OPTIONS, not per click (these buttons have no form)
  const receivedBy = ref<string | undefined>(undefined)

  // Payment is single-row only: one real pauperwave_payments write per click, no loop of N calls
  // without atomicity
  function setPaymentMethod(item: AcceptancePickerItem, method: PaymentMethod | null) {
    // Only a brand-new payment strictly needs receivedBy server-side (an update keeps its own), but
    // nudging for the session-wide desk-staff choice up front beats silently omitting it
    if (method !== null && !paymentMethodByPlayer[item.value] && !receivedBy.value) {
      toast.add({
        title: t('tournament.single.acceptancePicker.receivedByRequiredTitle'),
        description: t('tournament.single.acceptancePicker.receivedByRequiredDescription'),
        color: 'warning'
      })
      return
    }
    if (method !== null) Reflect.deleteProperty(testPayments.value, item.value)
    setPayment.mutate({
      associateUuid: item.value,
      method, receivedBy:
      receivedBy.value
    })
  }

  function togglePaymentMethod(item: AcceptancePickerItem, method: PaymentMethod) {
    setPaymentMethod(item, paymentMethodByPlayer[item.value] === method ? null : method)
  }

  function toggleTestPayment(item: AcceptancePickerItem) {
    if (testPayments.value[item.value]) {
      Reflect.deleteProperty(testPayments.value, item.value)
      return
    }
    // Mutually exclusive with a real payment method: a row shouldn't show both "Cash" and "Test"
    // active
    if (paymentMethodByPlayer[item.value]) setPaymentMethod(item, null)
    testPayments.value[item.value] = true
  }

  // Bulk-aware context-menu variant: unlike real payments (single-row, see setPaymentMethod),
  // "Pagamento test" is client-side localStorage state with no atomicity concern. Same "clicked row
  // decides the action, selection decides the scope" convention as resolveContextMenuTargets: every
  // target ends in the same on/off state as the clicked row's next value
  function toggleTestPaymentForTargets(items: AcceptancePickerItem[]) {
    const [anchor] = items
    if (!anchor) return
    const nextValue = !testPayments.value[anchor.value]
    for (const item of items) {
      if (nextValue) {
        if (paymentMethodByPlayer[item.value]) setPaymentMethod(item, null)
        testPayments.value[item.value] = true
      } else {
        Reflect.deleteProperty(testPayments.value, item.value)
      }
    }
  }

  return {
    setPayment,
    paymentMethodByPlayer,
    testPayments,
    receivedBy,
    setPaymentMethod,
    togglePaymentMethod,
    toggleTestPayment,
    toggleTestPaymentForTargets
  }
}
