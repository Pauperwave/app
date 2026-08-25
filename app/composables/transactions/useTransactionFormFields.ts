// app\composables\transactions\useTransactionFormFields.ts
// Extracted out of AddModal.vue/EditModal.vue (2026-08-15, both had the exact
// same associateOptions/selectedX/showEventField/isAssociationFee computeds,
// each already commented "same as the other file's" before this existed) —
// everything here is pure derived state from `state` + useTransactionFormOptions(),
// with no create/edit-specific behavior, so callers can share one instance
// each instead of duplicating it.
import type { InferOutput } from 'valibot'

// useTransactionFormOptions is a global auto-import (app/composables/**), not
// imported here — only its return type is needed, which Nuxt's generated
// ambient declarations already expose.
export type TransactionFormState = Partial<InferOutput<ReturnType<typeof useTransactionFormOptions>['schema']>>

export function useTransactionFormFields(state: TransactionFormState) {
  const { data: associatesData } = useAssociatesQuery()

  const {
    schema, paymentTypeOptions, paymentMethodOptions, receiverOptions, payerTabItems,
    tournamentOptions, eventOptions
  } = useTransactionFormOptions()

  // Only approved associates can be a payment's payer — pending/rejected requests
  // aren't members yet. APS Pauperwave's own membership record is excluded too —
  // it's the association itself, not an actual payer.
  const associateOptions = computed(() => (associatesData.value ?? [])
    .filter(associate => associate.membership_request_status === 'approved'
      && associate.uuid !== APS_PAUPERWAVE_ASSOCIATE_UUID)
    .map((associate) => {
      const label = `${associate.first_name} ${associate.last_name}`
      return {
        label,
        description: associate.pauperwave_associate_number ?? undefined,
        value: associate.uuid,
        avatar: { src: generatePlayerAvatar(label), alt: label }
      }
    }))

  // USelect/USelectMenu only bind the selected value (via value-key), not the
  // whole item — these compute the matching item's icon/avatar back out so the
  // trigger shows it too, not just the open dropdown's item list (Nuxt UI's own
  // USelectMenu avatar example does the same: :avatar="value?.avatar").
  const selectedPaymentTypeIcon = computed(() =>
    paymentTypeOptions.value.find(option => option.value === state.payment_type)?.icon)
  const selectedPaymentMethodIcon = computed(() =>
    paymentMethodOptions.value.find(option => option.value === state.payment_method)?.icon)
  const selectedAssociateAvatar = computed(() =>
    associateOptions.value.find(option => option.value === state.associate_uuid)?.avatar)
  const selectedReceiverAvatar = computed(() =>
    receiverOptions.value.find(option => option.value === state.received_by)?.avatar)

  // Tournament Fee links to a real tournament, Event Fee/Token Purchase to a
  // real event (ck_payment_type_event_link, migration 20260825220000) —
  // "Quota associativa" (a membership fee) and "Donazione" (a free-standing
  // gift) link to neither.
  const showTournamentField = computed(() => state.payment_type === 'Tournament Fee')
  const showEventField = computed(() =>
    state.payment_type === 'Event Fee' || state.payment_type === 'Token Purchase')

  // The membership fee is a fixed €5 via PayPal "Friends & Family" (see each
  // caller's own watch on payment_type) — both fields are disabled for this
  // type since neither is a per-transaction choice once that rule applies.
  const isAssociationFee = computed(() => state.payment_type === 'Association Fee')

  return {
    associatesData,
    schema,
    paymentTypeOptions,
    paymentMethodOptions,
    receiverOptions,
    payerTabItems,
    tournamentOptions,
    eventOptions,
    associateOptions,
    selectedPaymentTypeIcon,
    selectedPaymentMethodIcon,
    selectedAssociateAvatar,
    selectedReceiverAvatar,
    showTournamentField,
    showEventField,
    isAssociationFee
  }
}
