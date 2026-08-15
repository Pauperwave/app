<!-- app\components\transactions\list\PaymentInfoFields.vue -->
<!--
  The "Dati pagamento" field grid shared byte-for-byte between AddModal.vue
  and EditModal.vue (extracted 2026-08-15) — must be rendered inside their
  <UForm>, not standalone: UFormField's validation state comes from UForm's
  own provide/inject context, which reaches through this component's
  boundary the same as any other descendant.

  `state` is a v-model (defineModel), not a plain prop: both callers pass
  their own shallowReactive form state object for these fields to mutate
  in place (via v-model on each UFormField below) — a plain prop would
  trip vue/no-mutating-props for exactly that reason.
-->
<script setup lang="ts">
import type { TransactionFormState } from '~/composables/transactions/useTransactionFormFields'

const state = defineModel<TransactionFormState>('state', { required: true })

const {
  paymentTypeOptions, paymentMethodOptions, receiverOptions,
  selectedPaymentTypeIcon, selectedPaymentMethodIcon, selectedReceiverAvatar,
  showEventField, isAssociationFee
} = useTransactionFormFields(state.value)
</script>

<template>
  <p class="text-lg font-semibold text-primary">
    {{ $t('transaction.addModal.paymentInfo') }}
  </p>

  <div class="grid grid-cols-2 gap-2 mt-2">
    <UFormField
      :label="$t('transaction.addModal.fields.paymentDate')"
      name="payment_datetime"
      required
    >
      <UDateTimeInput v-model="state.payment_datetime" disabled class="w-full" />
    </UFormField>

    <UFormField
      :label="$t('transaction.addModal.fields.paymentAmount')"
      name="payment_amount"
      required
    >
      <UInputNumber
        v-model="state.payment_amount"
        :min="0"
        :step="0.5"
        :icon="ICONS.euro"
        :disabled="isAssociationFee"
        class="w-full"
      />
    </UFormField>

    <UFormField
      :label="$t('transaction.addModal.fields.receivedBy')"
      name="received_by"
      required
    >
      <USelectMenu
        v-model="state.received_by"
        :items="receiverOptions"
        value-key="value"
        :avatar="selectedReceiverAvatar"
        class="w-full"
      />
    </UFormField>

    <UFormField
      :label="$t('transaction.addModal.fields.paymentMethod')"
      name="payment_method"
    >
      <USelect
        v-model="state.payment_method"
        :items="paymentMethodOptions"
        value-key="value"
        :icon="selectedPaymentMethodIcon"
        :disabled="isAssociationFee"
        class="w-full"
      />
    </UFormField>

    <UFormField :label="$t('transaction.addModal.fields.paymentType')" name="payment_type">
      <USelect
        v-model="state.payment_type"
        :items="paymentTypeOptions"
        value-key="value"
        :icon="selectedPaymentTypeIcon"
        class="w-full"
      />
    </UFormField>

    <UFormField
      v-if="showEventField"
      :label="$t('transaction.addModal.fields.event')"
      name="event_name"
    >
      <USelectMenu
        v-model="state.event_name"
        :items="EVENT_OPTIONS"
        class="w-full"
      />
    </UFormField>
  </div>

  <UFormField :label="$t('transaction.addModal.fields.notes')" name="notes">
    <UTextarea v-model="state.notes" class="w-full" />
  </UFormField>
</template>
