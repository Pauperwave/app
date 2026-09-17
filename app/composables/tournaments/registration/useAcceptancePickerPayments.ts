// app\composables\tournaments\registration\useAcceptancePickerPayments.ts
// Payment-method tracking for AcceptancePicker.vue's "Iscritti (Pagato)"
// table — extracted 2026-09-18 alongside useWalkInPlayers.ts, once
// AcceptancePicker.vue had grown to 719 lines. Unlike CommanderRoundManager.vue
// (several independent modal flows sharing one component), this one is a
// single cohesive dual-table widget with genuinely intertwined selection/
// search/remove-confirm logic across both tables — see the component's own
// comments on cross-table bug fixes — so only the two concerns that don't
// touch that intertwined core (payments here, walk-in adds in the sibling
// composable) were pulled out; the rest stays in the component on purpose.
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

  // "Test" payment button — marks a player as paid for testing purposes
  // without writing a pauperwave_payments row. Kept out of
  // paymentMethodByPlayer/pauperwave_payments entirely ('test' isn't a real
  // PaymentMethod, ck_payment_method would reject it), but persisted to
  // localStorage via VueUse's useStorage (survive a reload without needing
  // an actual DB write) rather than a plain reactive() — keyed per
  // tournament so different tournaments' test marks don't collide.
  const testPayments = useStorage<Record<string, boolean>>(
    () => `tournament-test-payments-${toValue(tournamentUuid)}`, {}
  )

  // Who's running the check-in desk right now — required to record a *new*
  // pauperwave_payments row (received_by is NOT NULL, and there's no
  // "current logged-in user" to default it to, same gap already flagged in
  // useAssociatesBulkActions.ts). Chosen once per session from
  // RECEIVER_OPTIONS, not per click — these payment buttons have no form of
  // their own.
  const receivedBy = ref<string | undefined>(undefined)

  // Payment is single-row only (one real pauperwave_payments write per
  // click, no loop of N mutation calls with no atomicity between them).
  function setPaymentMethod(item: AcceptancePickerItem, method: PaymentMethod | null) {
    // Only a brand-new payment strictly needs receivedBy server-side (an
    // update to an existing row keeps its own) — but this session-wide
    // desk-staff selection is still worth nudging for up front, since
    // silently omitting it on every subsequent click would be confusing.
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
    // Mutually exclusive with a real payment method — a row shouldn't show
    // both a live "Cash" and the "Test" state active at once.
    if (paymentMethodByPlayer[item.value]) setPaymentMethod(item, null)
    testPayments.value[item.value] = true
  }

  // Bulk-aware context-menu variant — unlike real payment methods
  // (deliberately kept single-row, see setPaymentMethod's own comment),
  // "Pagamento test" is pure client-side localStorage state, not a
  // pauperwave_payments write, so there's no atomicity/error-class concern
  // looping over it. Same "clicked row decides the action, selection
  // decides the scope" convention as the component's own
  // resolveContextMenuTargets — every target ends up in the same on/off
  // state as the clicked row's own next value, rather than each toggling
  // independently off whatever its own prior state was.
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
