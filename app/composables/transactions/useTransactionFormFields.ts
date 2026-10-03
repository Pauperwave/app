// app\composables\transactions\useTransactionFormFields.ts
// Extracted from AddModal.vue/EditModal.vue, which had identical
// associateOptions/selectedX/showEventField/isAssociationFee computeds: pure derived state from
// `state` + useTransactionFormOptions() with no create/edit-specific behavior, so callers share one
// instance each
import type { InferOutput } from 'valibot'

// useTransactionFormOptions is a global auto-import (app/composables/**), not imported: only its
// return type is needed, which Nuxt's ambient declarations expose
export type TransactionFormState = Partial<InferOutput<ReturnType<typeof useTransactionFormOptions>['schema']>>

export function useTransactionFormFields(state: TransactionFormState) {
  const { data: associatesData } = useAssociatesQuery()

  const {
    schema, paymentTypeOptions, paymentMethodOptions, receiverOptions, payerTabItems,
    tournamentOptions, eventOptions
  } = useTransactionFormOptions()

  // Only approved associates can be a payer (pending/rejected aren't members yet); APS Pauperwave's
  // own record is excluded too (the association itself)
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

  // USelect/USelectMenu only bind the value (via value-key), so these compute the matching item's
  // icon/avatar back out for the trigger (as in Nuxt UI's USelectMenu avatar example)
  const selectedPaymentTypeIcon = computed(() =>
    paymentTypeOptions.value.find(option => option.value === state.payment_type)?.icon)
  const selectedPaymentMethodIcon = computed(() =>
    paymentMethodOptions.value.find(option => option.value === state.payment_method)?.icon)
  const selectedAssociateAvatar = computed(() =>
    associateOptions.value.find(option => option.value === state.associate_uuid)?.avatar)
  const selectedReceiverAvatar = computed(() =>
    receiverOptions.value.find(option => option.value === state.received_by)?.avatar)

  // Tournament Fee links to a real tournament, Event Fee/Token Purchase to a real event
  // (ck_payment_type_event_link); "Quota associativa" and "Donazione" link to neither
  const showTournamentField = computed(() => state.payment_type === 'Tournament Fee')
  const showEventField = computed(() =>
    state.payment_type === 'Event Fee' || state.payment_type === 'Token Purchase')

  // The membership fee is a fixed €5 via PayPal "Friends & Family" (see each caller's watch on
  // payment_type): both fields are disabled for it, not per-transaction choices
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
