<!-- app\components\transactions\list\EditModal.vue -->
<script setup lang="ts">
import type * as v from 'valibot'
import { parseAbsoluteToLocal, getLocalTimeZone, toCalendarDateTime } from '@internationalized/date'
import type { FormSubmitEvent } from '@nuxt/ui'
import type { Transaction } from '~/types'

const open = defineModel<boolean>({ default: false })
const { transaction } = defineProps<{ transaction: Transaction | null }>()

const toast = useToast()
const { t } = useI18n()
const { updateTransaction } = useTransactionsMutations()
const { data: associatesData } = useAssociatesQuery()

// APS Pauperwave's own membership record is excluded — it's the association
// itself, not an actual payer.
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

const {
  schema, paymentTypeOptions, paymentMethodOptions, receiverOptions
} = useTransactionFormOptions()

type Schema = v.InferOutput<typeof schema>

// Same reasoning as AddModal.vue's state init: payment_amount/received_by
// must be present (even as undefined) or valibot's v.object() raises its own
// generic "missing key" issue instead of running the field's real check.
// The [open, transaction] watch below fills these immediately in practice,
// but this keeps the object shape correct even before that watch runs.
const state = shallowReactive<Partial<Schema>>({
  payment_amount: undefined,
  received_by: undefined
})

// See AddModal.vue's identical computeds for why these are needed: USelect/
// USelectMenu only bind the selected value (via value-key), not the item, so
// the trigger can't show its icon/avatar without looking it back up.
const selectedPaymentTypeIcon = computed(() =>
  paymentTypeOptions.value.find(option => option.value === state.payment_type)?.icon)
const selectedPaymentMethodIcon = computed(() =>
  paymentMethodOptions.value.find(option => option.value === state.payment_method)?.icon)
const selectedAssociateAvatar = computed(() =>
  associateOptions.value.find(option => option.value === state.associate_uuid)?.avatar)
const selectedReceiverAvatar = computed(() =>
  receiverOptions.value.find(option => option.value === state.received_by)?.avatar)

// The event field only makes sense for a tournament/event-linked payment —
// hidden for "Quota associativa" (a membership fee, not tied to any event)
// and "Donazione" (a free-standing gift, same reasoning).
const showEventField = computed(() =>
  state.payment_type !== 'Association Fee' && state.payment_type !== 'Donation')

// The membership fee is a fixed €5 via PayPal "Friends & Family" (see the
// watch below) — both fields are disabled for this type since neither is a
// per-transaction choice once that rule applies.
const isAssociationFee = computed(() => state.payment_type === 'Association Fee')

// Refills every time the modal opens on a (possibly new) transaction — same
// convention as AssociatesListEditModal.vue's watch on its `associate` prop.
watch([open, () => transaction], ([isOpen, current]) => {
  if (!isOpen || !current) return
  state.payer_is_associate = !!current.associate
  state.associate_uuid = current.associate?.uuid
  state.payer_name = current.payer_name ?? undefined
  state.payer_surname = current.payer_surname ?? undefined
  state.payer_email = current.payer_email ?? undefined
  state.payer_tax_code = current.payer_tax_code ?? undefined
  state.payment_datetime = toCalendarDateTime(parseAbsoluteToLocal(current.payment_date))
  state.payment_amount = current.payment_amount
  state.payment_method = current.payment_method
  state.payment_type = current.payment_type
  state.received_by = current.received_by
  state.event_name = current.event_name ?? undefined
  state.notes = current.notes
}, { immediate: true })

const activeTab = computed({
  get: () => (state.payer_is_associate ? 'associate' : 'external'),
  set: (value: string) => { state.payer_is_associate = value === 'associate' }
})

const items = computed(() => [
  { label: t('transaction.addModal.tabs.associate'), icon: ICONS.playerConfirmed, slot: 'associate', value: 'associate' },
  { label: t('transaction.addModal.tabs.external'), icon: ICONS.edit, slot: 'external', value: 'external' }
])

const payerTaxCodeInput = computed({
  get: () => state.payer_tax_code,
  set: (value) => { state.payer_tax_code = value?.toUpperCase() || '' }
})

// The membership fee is a fixed €5 via PayPal "Friends & Family" — same rule as
// AddModal.vue, applied here too since editing a payment into "Association Fee"
// should follow it just as much as creating one.
watch(() => state.payment_type, (type, previous) => {
  if (type !== 'Association Fee' || previous === undefined) return
  state.payment_amount = MEMBERSHIP_FEE_AMOUNT
  state.payment_method = MEMBERSHIP_FEE_PAYMENT_METHOD
})

// Clears any event picked before switching to a type whose field is hidden
// (see showEventField) — separate from the watch above since this also
// covers "Donazione", which doesn't force the amount/method.
watch(showEventField, (visible) => {
  if (!visible) state.event_name = undefined
})

// Traceability (user request, 2026-08-12): who created/last edited this
// payment and when — resolved against the same associates cache already
// loaded for the payer picker, no extra request. created_by/updated_by are
// null for rows written before the audit columns existed
// (migration 20260812150000_payments_audit_columns.sql).
function associateName(uuid: string | null): string | undefined {
  if (!uuid) return undefined
  const associate = (associatesData.value ?? []).find(a => a.uuid === uuid)
  return associate ? `${associate.first_name} ${associate.last_name}` : undefined
}

const dateTimeFormatter = new Intl.DateTimeFormat('it-IT', {
  day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
})

const traceability = computed(() => {
  if (!transaction) return null
  return {
    createdBy: associateName(transaction.created_by) ?? t('transaction.editModal.unknown'),
    createdAt: dateTimeFormatter.format(new Date(transaction.created_at)),
    updatedBy: associateName(transaction.updated_by) ?? t('transaction.editModal.unknown'),
    updatedAt: dateTimeFormatter.format(new Date(transaction.updated_at))
  }
})

const submitting = ref(false)

async function onSubmit(event: FormSubmitEvent<Schema>) {
  if (!transaction) return

  submitting.value = true
  try {
    await updateTransaction.mutateAsync({
      id: transaction.id,
      edits: {
        associateUuid: event.data.payer_is_associate ? (event.data.associate_uuid ?? null) : null,
        payerName: event.data.payer_is_associate ? null : (event.data.payer_name ?? null),
        payerSurname: event.data.payer_is_associate ? null : (event.data.payer_surname ?? null),
        payerEmail: event.data.payer_is_associate ? null : (event.data.payer_email ?? null),
        payerTaxCode: event.data.payer_is_associate ? null : (event.data.payer_tax_code ?? null),
        paymentDate: event.data.payment_datetime.toDate(getLocalTimeZone()).toISOString(),
        paymentAmount: event.data.payment_amount,
        paymentMethod: event.data.payment_method,
        paymentType: event.data.payment_type,
        receivedBy: event.data.received_by,
        eventUuid: null,
        eventName: event.data.event_name ?? null,
        notes: event.data.notes ?? ''
      }
    })

    toast.add({
      title: t('transaction.editModal.successToastTitle'),
      color: 'success'
    })
    open.value = false
  } catch (err) {
    toast.add({
      title: t('transaction.editModal.errorToastTitle'),
      description: toErrorMessage(err),
      color: 'error'
    })
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <UModal
    v-model:open="open"
    :ui="{ content: 'max-w-xl' }"
    :title="$t('transaction.editModal.title')"
  >
    <template #body>
      <UForm
        v-if="transaction"
        :schema="schema"
        :state="state"
        class="space-y-2"
        @submit="onSubmit"
      >
        <div class="space-y-1">
          <p class="text-lg font-semibold text-primary">
            {{ $t('transaction.addModal.personalInfo') }}
          </p>

          <UTabs v-model="activeTab" :items="items">
            <template #associate>
              <div class="mt-2">
                <UFormField
                  :label="$t('transaction.addModal.fields.member')"
                  name="associate_uuid"
                  required
                >
                  <USelectMenu
                    v-model="state.associate_uuid"
                    :items="associateOptions"
                    value-key="value"
                    :placeholder="$t('transaction.addModal.fields.selectMember')"
                    :icon="selectedAssociateAvatar ? undefined : ICONS.player"
                    :avatar="selectedAssociateAvatar"
                    class="w-full"
                  />
                </UFormField>
              </div>
            </template>

            <template #external>
              <div class="grid grid-cols-2 gap-2 mt-2">
                <UFormField
                  :label="$t('transaction.addModal.fields.firstName')"
                  name="payer_name"
                  required
                >
                  <UInput
                    v-model="state.payer_name"
                    type="text"
                    class="w-full"
                    color="neutral"
                  />
                </UFormField>

                <UFormField
                  :label="$t('transaction.addModal.fields.lastName')"
                  name="payer_surname"
                  required
                >
                  <UInput
                    v-model="state.payer_surname"
                    type="text"
                    class="w-full"
                    color="neutral"
                  />
                </UFormField>

                <UFormField
                  :label="$t('transaction.addModal.fields.email')"
                  name="payer_email"
                  required
                >
                  <UInput
                    v-model="state.payer_email"
                    type="email"
                    class="w-full"
                    color="neutral"
                    :icon="ICONS.atSign"
                  />
                </UFormField>

                <UFormField
                  :label="$t('transaction.addModal.fields.taxCode')"
                  name="payer_tax_code"
                  required
                >
                  <UInput
                    v-model="payerTaxCodeInput"
                    type="text"
                    class="w-full"
                    color="neutral"
                    maxlength="16"
                  />
                </UFormField>
              </div>
            </template>
          </UTabs>
        </div>

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
            <USelectMenu v-model="state.event_name" :items="EVENT_OPTIONS" class="w-full" />
          </UFormField>
        </div>

        <UFormField :label="$t('transaction.addModal.fields.notes')" name="notes">
          <UTextarea v-model="state.notes" class="w-full" />
        </UFormField>

        <p v-if="traceability" class="text-xs text-muted">
          {{ $t('transaction.editModal.createdBy', {
            name: traceability.createdBy, date: traceability.createdAt
          }) }}
          ·
          {{ $t('transaction.editModal.updatedBy', {
            name: traceability.updatedBy, date: traceability.updatedAt
          }) }}
        </p>

        <div class="flex justify-end gap-2">
          <UButton
            :label="$t('transaction.editModal.cancel')"
            color="neutral"
            variant="subtle"
            :disabled="submitting"
            @click="() => { open = false }"
          />
          <UButton
            :label="$t('transaction.editModal.save')"
            color="primary"
            variant="solid"
            type="submit"
            :loading="submitting"
          />
        </div>
      </UForm>
    </template>
  </UModal>
</template>
