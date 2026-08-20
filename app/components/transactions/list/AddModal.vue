<!-- app\components\transactions\list\AddModal.vue -->
<script setup lang="ts">
// fallow-ignore-file code-duplication -- UForm scaffolding + the "personal
// info" heading mirror EditModal.vue's, but the TransactionsFieldsPayerFields
// call right below diverges (AddModal passes presetAssociate/
// emailPlaceholder/showClearButtons, EditModal doesn't) — same same-shaped-
// but-parameterized call as feedback_dedup_threshold_call_sites, not worth a
// wrapper for 5 lines of markup.
import type * as v from 'valibot'
import { now, getLocalTimeZone, toCalendarDateTime } from '@internationalized/date'
import type { FormSubmitEvent } from '@nuxt/ui'
import type { Associate } from '~/types'
import type { TransactionFormState } from '~/composables/transactions/useTransactionFormFields'

// Define the model to accept open state from parent
const open = defineModel<boolean>({ default: false })
// presetAssociate: set when opened from an associate's "Rinnova" context-menu
// action (useAssociatesRowActions.ts) — locks the payer to that associate and
// preselects "Association Fee" instead of showing the associate/external tabs,
// since a renewal is always for a specific, already-known associate.
// hideTrigger: the associates pages render this component purely to host modal
// state driven by their own context menu (same convention as
// AssociatesListEditModal.vue, which has no trigger at all) — presetAssociate
// alone can't signal that, since it's null until "Rinnova" is actually clicked.
const { presetAssociate = null, hideTrigger = false } = defineProps<{
  presetAssociate?: Associate | null
  hideTrigger?: boolean
}>()

const toast = useToast()
const { t } = useI18n()
const { createTransaction } = useTransactionsMutations()

function createInitialState(): TransactionFormState {
  return {
    payment_method: 'Cash',
    payment_type: 'Tournament Fee',
    payer_is_associate: true,
    // Local time, not UTC: a UTC-based default shifts the displayed date/time by
    // the browser's offset (same class of bug fixed in
    // AssociatesListEditModal.vue's born_date serialization).
    payment_datetime: toCalendarDateTime(now(getLocalTimeZone())),
    // Present (as undefined) rather than omitted: valibot's v.object() treats a
    // genuinely absent key differently from a key whose value is undefined —
    // absent raises its own generic "Invalid key: Expected ... but received
    // undefined" issue instead of running the field's actual v.number()/
    // v.string() check, which is where our custom validation messages
    // (amountRequired/receivedByRequired) actually live. Every other required
    // field above already has a real default value, so it never hit this.
    payment_amount: 5,
    received_by: undefined,
    associate_uuid: undefined,
    payer_name: undefined,
    payer_surname: undefined,
    payer_email: undefined,
    payer_tax_code: undefined,
    event_name: undefined,
    notes: undefined
  }
}

const state = shallowReactive<TransactionFormState>(createInitialState())

const {
  schema, associatesData, associateOptions, selectedAssociateAvatar, showEventField, payerTabItems
} = useTransactionFormFields(state)

type Schema = v.InferOutput<typeof schema>

// Refills every time the modal opens targeting a (possibly new) preset associate —
// same convention as AssociatesListEditModal.vue's watch on its `associate` prop.
watch([open, () => presetAssociate], ([isOpen, associate]) => {
  if (!isOpen || !associate) return
  state.payer_is_associate = true
  state.associate_uuid = associate.uuid
  state.payment_type = 'Association Fee'
}, { immediate: true })

// The membership fee is admin-editable (settings.membershipFeeAmount/
// membershipFeePaymentMethod, /settings — migration 20260819100000, was a
// hardcoded €5-via-PayPal constant until then), but always the same value
// for every payment regardless of type (first payment and every renewal
// alike, user decision 2026-08-12) — not just a suggestion for the Rinnova
// flow, so this also fires when staff pick "Quota associativa" manually from
// the generic "Nuova transazione" form. The amount field is disabled for
// this type in the template (2026-08-14 decision) since it's a fixed bylaw
// value, not a per-transaction choice. Watches settings.data too, not just
// payment_type, so picking the type before the settings query resolves
// still fills in correctly once it does.
const settings = useSettingsQuery()
watch([() => state.payment_type, settings.data], ([type, data]) => {
  if (type !== 'Association Fee' || !data) return
  state.payment_amount = data.membershipFeeAmount
  state.payment_method = data.membershipFeePaymentMethod
})

// Clears any event picked before switching to a type whose field is hidden
// (see showEventField) — separate from the watch above since this also
// covers "Donazione", which doesn't force the amount/method.
watch(showEventField, (visible) => {
  if (!visible) state.event_name = undefined
})

// String, not a numeric index: UTabs' v-model always emits the item's `value` as
// a string once the user interacts with it, even for the already-active tab —
// comparing against the number 0 only worked before the first interaction
// (found 2026-08-12: after clicking "Associato" once, activeTab became the
// string '0', `newTab === 0` silently went false, and payer_is_associate flipped
// to false, making the external-payer fields required on the associate tab too).
const activeTab = ref('associate')

watch(activeTab, (newTab) => {
  state.payer_is_associate = newTab === 'associate'
})

// The modal component stays mounted across open/close cycles (transactions/
// index.vue always renders it) — without this, picking "Persona esterna" once
// then closing and reopening the modal would leave that tab active on the next,
// unrelated transaction. A fresh "Nuova transazione" should always start on
// "Associato".
watch(open, (isOpen) => {
  if (isOpen) activeTab.value = 'associate'
})

const selectedAssociate = computed<Associate | null>(() => presetAssociate
  ?? associatesData.value?.find(associate => associate.uuid === state.associate_uuid)
  ?? null)

const selectedAssociateLabel = computed(() => selectedAssociate.value
  ? `${selectedAssociate.value.first_name} ${selectedAssociate.value.last_name}`
  : undefined)

// Surfaces membership_status right under the picker so staff notice, before
// submitting, whether the selected socio actually needs this payment — e.g.
// picking someone already "active" for a renewal would be redundant. Only
// active/to_renew/expired are reachable here: both associateOptions and the
// Rinnova entry point (useAssociatesRowActions.ts) only ever offer approved
// associates.
const membershipStatusAlert = computed(() => {
  const associate = selectedAssociate.value
  if (!associate) return null
  const { color, icon } = MEMBERSHIP_STATUS_BADGE_CONFIG[associate.membership_status]
    ?? { color: 'neutral' as const, icon: ICONS.help }
  return {
    color,
    icon,
    title: t(
      `transaction.addModal.membershipStatusAlert.${associate.membership_status}`,
      { name: selectedAssociateLabel.value }
    )
  }
})

const modalTitle = computed(() => presetAssociate
  ? t('transaction.addModal.renewTitle', { name: selectedAssociateLabel.value })
  : t('transaction.addModal.title'))

const modalDescription = computed(() => presetAssociate
  ? t('transaction.addModal.renewDescription')
  : t('transaction.addModal.description'))

const submitting = ref(false)

// UModal only hides/shows, it does not unmount the form, so the state has to
// be cleared explicitly — called on successful submit and on explicit
// "Annulla", but deliberately NOT on the X button or an outside click, which
// should preserve whatever the user typed (user decision 2026-08-20). The
// [open, presetAssociate] watch above independently refills the Rinnova case
// on next open, so this only matters for the generic "Nuova transazione" flow.
function resetForm() {
  Object.assign(state, createInitialState())
  activeTab.value = 'associate'
}

async function onSubmit(event: FormSubmitEvent<Schema>) {
  submitting.value = true
  try {
    const { renewed } = await createTransaction.mutateAsync({
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
    })

    toast.add({
      title: t('transaction.addModal.successToastTitle'),
      description: event.data.payer_is_associate
        ? t('transaction.addModal.successToastDescriptionAssociate', {
          amount: event.data.payment_amount,
          name: selectedAssociateLabel.value ?? ''
        })
        : t('transaction.addModal.successToastDescriptionExternal', {
          amount: event.data.payment_amount,
          name: `${event.data.payer_name ?? ''} ${event.data.payer_surname ?? ''}`
        }),
      color: 'success'
    })
    if (renewed) {
      toast.add({ title: t('transaction.addModal.renewedToastTitle'), color: 'success' })
    }
    open.value = false
    resetForm()
  } catch (err) {
    toast.add({
      title: t('transaction.addModal.errorToastTitle'),
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
    :title="modalTitle"
    :description="modalDescription"
  >
    <!-- No trigger button when opened programmatically with a preset associate
         (Rinnova) — only the generic "+ Nuova transazione" entry point shows one. -->
    <AddButton
      v-if="!hideTrigger"
      :label="$t('transaction.addModal.openButton')"
      :icon="ICONS.coins"
      @click="open = true"
    />

    <template #body>
      <UForm
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
            :preset-associate="presetAssociate"
            :associate-options="associateOptions"
            :selected-associate-avatar="selectedAssociateAvatar"
            :payer-tab-items="payerTabItems"
            :membership-status-alert="membershipStatusAlert"
            :email-placeholder="$t('transaction.addModal.fields.emailPlaceholder')"
            show-clear-buttons
          />
        </div>

        <TransactionsListPaymentInfoFields v-model:state="state" />

        <div class="flex justify-end gap-2">
          <UButton
            :label="$t('transaction.addModal.cancel')"
            color="neutral"
            variant="subtle"
            :disabled="submitting"
            @click="() => { open = false; resetForm() }"
          />
          <UButton
            :label="$t('transaction.addModal.create')"
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
