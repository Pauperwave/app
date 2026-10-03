<!-- app\components\transactions\list\AddModal.vue -->
<script setup lang="ts">
// fallow-ignore-file code-duplication -- UForm scaffolding mirrors EditModal.vue's
import type * as v from 'valibot'
import { now, getLocalTimeZone, toCalendarDateTime } from '@internationalized/date'
import type { FormSubmitEvent } from '@nuxt/ui'
import type { Associate } from '~/types'
import type { TransactionFormState } from '~/composables/transactions/useTransactionFormFields'

// Define the model to accept open state from parent
const open = defineModel<boolean>({ default: false })
// presetAssociate: set when opened from an associate's "Rinnova" context-menu action
// (useAssociatesRowActions.ts): locks the payer to that associate and preselects "Association Fee"
// instead of the associate/external tabs, since a renewal is for a known associate. hideTrigger:
// the associates pages render this component only to host modal state driven by their context menu
// (like AssociatesListEditModal.vue); presetAssociate can't signal that, being null until "Rinnova"
// is clicked
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
    // Present (as undefined) rather than omitted: valibot's v.object() treats an absent key
    // differently from an undefined value: absent raises its own generic "Invalid key" issue
    // instead of running the field's v.number()/v.string() check, where our custom messages
    // (amountRequired/receivedByRequired) live. Every other required field has a real default, so
    // it never hit this
    payment_amount: 5,
    received_by: undefined,
    associate_uuid: undefined,
    payer_name: undefined,
    payer_surname: undefined,
    payer_email: undefined,
    payer_tax_code: undefined,
    tournament_uuid: undefined,
    event_uuid: undefined,
    notes: undefined
  }
}

const state = shallowReactive<TransactionFormState>(createInitialState())

const {
  schema, associatesData, associateOptions, selectedAssociateAvatar,
  showTournamentField, showEventField, payerTabItems
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

// The membership fee is admin-editable (settings.membershipFeeAmount/membershipFeePaymentMethod,
// /settings, migration 20260819100000) but the same for every payment regardless of type (first
// payment and renewals alike), not just a suggestion for the Rinnova flow: this also fires when
// staff pick "Quota associativa" from the generic "Nuova transazione" form. The amount field is
// disabled for this type in the template (a fixed bylaw value, not a per-transaction choice).
// Watches settings.data too, not just payment_type, so picking the type before the settings query
// resolves still fills in once it does
const settings = useSettingsQuery()
watch([() => state.payment_type, settings.data], ([type, data]) => {
  if (type !== 'Association Fee' || !data) return
  state.payment_amount = data.membershipFeeAmount
  state.payment_method = data.membershipFeePaymentMethod
})

// Clears any tournament/event picked before switching to a type whose field is hidden (see
// showTournamentField/showEventField); separate from the watch above since this also covers
// "Donazione", which doesn't force the amount/method
watch(showTournamentField, (visible) => {
  if (!visible) state.tournament_uuid = undefined
})
watch(showEventField, (visible) => {
  if (!visible) state.event_uuid = undefined
})

// String, not a numeric index: UTabs' v-model emits the item's `value` as a string once the user
// interacts, even for the active tab, so comparing against 0 only worked before the first
// interaction (after clicking "Associato" once, activeTab became '0', `newTab === 0` went false and
// payer_is_associate flipped to false, requiring the external-payer fields on the associate tab
// too)
const activeTab = ref('associate')

watch(activeTab, (newTab) => {
  state.payer_is_associate = newTab === 'associate'
})

// The modal stays mounted across open/close cycles (transactions/index.vue always renders it):
// without this, picking "Persona esterna" then closing and reopening would leave that tab active on
// the next, unrelated transaction. A fresh "Nuova transazione" starts on "Associato"
watch(open, (isOpen) => {
  if (isOpen) activeTab.value = 'associate'
})

const selectedAssociate = computed<Associate | null>(() => presetAssociate
  ?? associatesData.value?.find(associate => associate.uuid === state.associate_uuid)
  ?? null)

const selectedAssociateLabel = computed(() => selectedAssociate.value
  ? `${selectedAssociate.value.first_name} ${selectedAssociate.value.last_name}`
  : undefined)

// Surfaces membership_status under the picker so staff notice before submitting whether the
// selected socio needs this payment (a renewal for someone already "active" is redundant). Only
// active/to_renew/expired are reachable: associateOptions and the Rinnova entry point
// (useAssociatesRowActions.ts) only offer approved associates
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

// UModal only hides/shows and doesn't unmount the form, so the state is cleared explicitly: on
// successful submit and on "Annulla", deliberately NOT on the X button or an outside click, which
// preserve what the user typed. The [open, presetAssociate] watch above refills the Rinnova case on
// next open, so this matters only for the generic "Nuova transazione" flow
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
      tournamentUuid: event.data.tournament_uuid ?? null,
      eventUuid: event.data.event_uuid ?? null,
      // A brand-new transaction has no historical-import provenance text to
      // preserve, unlike EditModal.vue's own onSubmit.
      eventName: null,
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
    <!-- No trigger button when opened programmatically with a preset associate (Rinnova): only the
         generic "+ Nuova transazione" entry point shows one -->
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
