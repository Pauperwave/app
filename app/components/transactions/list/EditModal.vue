<!-- app\components\transactions\list\EditModal.vue -->
<script setup lang="ts">
// fallow-ignore-file code-duplication -- see the same comment in
// AddModal.vue
import type * as v from 'valibot'
import { parseAbsoluteToLocal, getLocalTimeZone, toCalendarDateTime } from '@internationalized/date'
import type { FormSubmitEvent } from '@nuxt/ui'
import type { Transaction } from '~/types'
import type { TransactionFormState } from '~/composables/transactions/useTransactionFormFields'

const open = defineModel<boolean>({ default: false })
const { transaction } = defineProps<{ transaction: Transaction | null }>()

const toast = useToast()
const { t } = useI18n()
const { updateTransaction } = useTransactionsMutations()

// Same reasoning as AddModal.vue's state init: payment_amount/received_by
// must be present (even as undefined) or valibot's v.object() raises its own
// generic "missing key" issue instead of running the field's real check.
// The [open, transaction] watch below fills these immediately in practice,
// but this keeps the object shape correct even before that watch runs.
const state = shallowReactive<TransactionFormState>({
  payment_amount: undefined,
  received_by: undefined
})

const {
  schema, associateOptions, selectedAssociateAvatar,
  showTournamentField, showEventField, payerTabItems
} = useTransactionFormFields(state)

type Schema = v.InferOutput<typeof schema>

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
  state.tournament_uuid = current.tournament?.uuid
  state.event_uuid = current.event?.uuid
  state.notes = current.notes
}, { immediate: true })

const activeTab = computed({
  get: () => (state.payer_is_associate ? 'associate' : 'external'),
  set: (value: string) => { state.payer_is_associate = value === 'associate' }
})

// The membership fee is admin-editable (settings.membershipFeeAmount/
// membershipFeePaymentMethod, /settings) — same rule as AddModal.vue, applied
// here too since editing a payment into "Association Fee" should follow it
// just as much as creating one. Single-source watch (not settings.data too,
// unlike AddModal.vue) is deliberate: `previous === undefined` guards the
// initial [open, transaction] watch's fill (the transaction's own recorded
// amount/method, which may differ from the current fee if it's changed since)
// from being clobbered the moment settings.data resolves after the modal
// opens — this should only ever re-apply on an actual type change by the user.
const settings = useSettingsQuery()
watch(() => state.payment_type, (type, previous) => {
  if (type !== 'Association Fee' || previous === undefined) return
  const data = settings.data.value
  if (!data) return
  state.payment_amount = data.membershipFeeAmount
  state.payment_method = data.membershipFeePaymentMethod
})

// Clears any tournament/event picked before switching to a type whose field
// is hidden (see showTournamentField/showEventField) — separate from the
// watch above since this also covers "Donazione", which doesn't force the
// amount/method.
watch(showTournamentField, (visible) => {
  if (!visible) state.tournament_uuid = undefined
})
watch(showEventField, (visible) => {
  if (!visible) state.event_uuid = undefined
})

// Traceability (user request, 2026-08-12): who created/last edited this
// payment and when — createdBy/updatedBy are already resolved names from
// useTransactionsQuery.ts's join (2026-08-18), '' for rows written before the
// audit columns existed (migration 20260812150000_payments_audit_columns.sql).
const dateTimeFormatter = new Intl.DateTimeFormat('it-IT', {
  day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
})

const traceability = computed(() => {
  if (!transaction) return null
  return {
    createdBy: transaction.createdBy || t('transaction.editModal.unknown'),
    createdAt: dateTimeFormatter.format(new Date(transaction.created_at)),
    updatedBy: transaction.updatedBy || t('transaction.editModal.unknown'),
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
        tournamentUuid: event.data.tournament_uuid ?? null,
        eventUuid: event.data.event_uuid ?? null,
        // No longer editable via this form (tournamentUuid/eventUuid above
        // are the real link now) — passed through unchanged rather than
        // cleared, so an edit doesn't wipe historical-import provenance text
        // still needed elsewhere (e.g. gettoni-encoded rows,
        // transactionGettoni.ts).
        eventName: transaction.event_name,
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
  <!-- fallow-ignore-file code-duplication -- see the top-of-file comment -->
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

          <TransactionsFieldsPayerFields
            v-model:active-tab="activeTab"
            :state="state"
            :associate-options="associateOptions"
            :selected-associate-avatar="selectedAssociateAvatar"
            :payer-tab-items="payerTabItems"
          />
        </div>

        <TransactionsListPaymentInfoFields v-model:state="state" />

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
