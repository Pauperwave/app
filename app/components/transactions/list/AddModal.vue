<!-- app\components\transactions\list\AddModal.vue -->
<script setup lang="ts">
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

const state = shallowReactive<TransactionFormState>({
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
  received_by: undefined
})

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

// The membership fee is a fixed €5 via PayPal "Friends & Family", first payment
// and every renewal alike (user decision, 2026-08-12) — not just a suggestion for
// the Rinnova flow, so this also fires when staff pick "Quota associativa"
// manually from the generic "Nuova transazione" form. The amount field is
// disabled for this type in the template (2026-08-14 decision) since it's a
// fixed bylaw value, not a per-transaction choice.
watch(() => state.payment_type, (type) => {
  if (type !== 'Association Fee') return
  state.payment_amount = MEMBERSHIP_FEE_AMOUNT
  state.payment_method = MEMBERSHIP_FEE_PAYMENT_METHOD
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

const payerTaxCodeInput = computed({
  get: () => state.payer_tax_code,
  set: (value) => {
    state.payer_tax_code = value?.toUpperCase() || ''
  }
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

          <div v-if="presetAssociate" class="space-y-2">
            <div class="flex items-center gap-2 rounded-md border border-default p-3">
              <UIcon :name="ICONS.playerConfirmed" class="size-5 text-muted shrink-0" />
              <div class="min-w-0">
                <p class="font-medium truncate">
                  {{ presetAssociate.first_name }} {{ presetAssociate.last_name }}
                </p>
                <p v-if="presetAssociate.pauperwave_associate_number" class="text-sm text-muted">
                  {{ presetAssociate.pauperwave_associate_number }}
                </p>
              </div>
            </div>

            <UAlert
              v-if="membershipStatusAlert"
              variant="subtle"
              v-bind="membershipStatusAlert"
            />
          </div>

          <UTabs v-else v-model="activeTab" :items="payerTabItems">
            <template #associate>
              <div class="mt-2 space-y-2">
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

                <UAlert
                  v-if="membershipStatusAlert"
                  variant="subtle"
                  v-bind="membershipStatusAlert"
                />
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
                  >
                    <template v-if="state.payer_name?.length" #trailing>
                      <UClearButton v-model="state.payer_name" />
                    </template>
                  </UInput>
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
                  >
                    <template v-if="state.payer_surname?.length" #trailing>
                      <UClearButton v-model="state.payer_surname" />
                    </template>
                  </UInput>
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
                    :placeholder="$t('transaction.addModal.fields.emailPlaceholder')"
                    :icon="ICONS.atSign"
                  >
                    <template v-if="state.payer_email?.length" #trailing>
                      <UClearButton v-model="state.payer_email" />
                    </template>
                  </UInput>
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
                  >
                    <template v-if="state.payer_tax_code?.length" #trailing>
                      <UClearButton v-model="state.payer_tax_code" />
                    </template>
                  </UInput>
                </UFormField>
              </div>
            </template>
          </UTabs>
        </div>

        <TransactionsListPaymentInfoFields v-model:state="state" />

        <div class="flex justify-end gap-2">
          <UButton
            :label="$t('transaction.addModal.cancel')"
            color="neutral"
            variant="subtle"
            :disabled="submitting"
            @click="() => { open = false }"
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
