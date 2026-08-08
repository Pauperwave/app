<!-- app\components\transactions\list\AddModal.vue -->
<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'

// Define the model to accept open state from parent
const open = defineModel<boolean>({ default: false })
const toast = useToast()
const { t } = useI18n()

// Dati presi da 'nomi_addetti'
const receiverOptions = [
  'Baldo Riccardo',
  'Cazzola Marco',
  'Castelli Lorenzo',
  'Cordeschi Nicola',
  'Debiasi Samuel',
  'Festi Emanuele',
  'Marisa Simone',
  'Nardi Emanuele',
  'Petrolli Filippo',
  'Pietropoli Carlo'
]

const eventOptions = [
  'Torneo Commander',
  'Torneo Pauper',
  'Torneo Multiformato',
  'Quota associativa 2025',
  'Draft',
  'Grande evento',
  'Chaos Draft di Natale',
  'Torneo One Piece',
  'Premodern&Birrino',
  'Commanderwave Fest'
]

// Reordere in priority order
// predefinito 'torneo'
const paymentTypeOptions = computed(() => [
  { value: 'entry-fee', label: t('transaction.addModal.paymentTypeOptions.entryFee'), icon: 'i-lucide-trophy' },
  { value: 'membership', label: t('transaction.addModal.paymentTypeOptions.membership'), icon: 'i-lucide-users' },
  { value: 'event-fee', label: t('transaction.addModal.paymentTypeOptions.eventFee'), icon: 'i-lucide-calendar' },
  { value: 'donation', label: t('transaction.addModal.paymentTypeOptions.donation'), icon: 'i-lucide-heart-handshake' }
])

const paymentMethodOptions = computed(() => [
  { value: 'cash', label: t('transaction.addModal.paymentMethodOptions.cash') },
  { value: 'paypal', label: 'PayPal' },
  { value: 'pos', label: 'POS' },
  { value: 'bank-transfer', label: t('transaction.addModal.paymentMethodOptions.bankTransfer') }
])

const schema = z.object({
  associate_id: z.string().optional(),
  payer_is_associate: z.boolean().default(true),
  payer_name: z.string().min(2, { message: t('transaction.addModal.validation.payerFirstNameTooShort') }).optional(),
  payer_surname: z.string().min(2, { message: t('transaction.addModal.validation.payerLastNameTooShort') }).optional(),
  // https://github.com/colinhacks/zod/issues/4642#issuecomment-2957508997
  // - trim per rimuovere spazi
  // - email per validare il formato
  // - toLowerCase per normalizzare
  payer_email: z.string().check(z.trim(), z.email(), z.toLowerCase()),
  payer_tax_code: z.string().trim().optional(),
  // le date possono essere sia passate che future
  payment_datetime: z.string(),
  payment_amount: z.number().nonnegative({
    message: t('transaction.addModal.validation.amountNotNegative')
  }),
  payment_method: z.enum(['Cash', 'PayPal', 'POS', 'Bank Transfer'], {
    message: t('transaction.addModal.validation.invalidPaymentMethod')
  }),
  received_by: z.string().trim().optional(),
  payment_type: z.enum(paymentTypeOptions.value.map(option => option.value), {
    message: t('transaction.addModal.validation.invalidPaymentType')
  }),
  event_name: z.string().optional(),
  notes: z.string().optional()
}).superRefine((data, ctx) => {
  if (!data.payer_is_associate) {
    if (!data.payer_name) ctx.addIssue({ code: 'custom', path: ['payer_name'], message: t('transaction.addModal.validation.payerFirstNameRequired') })
    if (!data.payer_surname) ctx.addIssue({ code: 'custom', path: ['payer_surname'], message: t('transaction.addModal.validation.payerLastNameRequired') })
    if (!data.payer_email) ctx.addIssue({ code: 'custom', path: ['payer_email'], message: t('transaction.addModal.validation.payerEmailRequired') })
    if (!data.payer_tax_code) ctx.addIssue({ code: 'custom', path: ['payer_tax_code'], message: t('transaction.addModal.validation.payerTaxCodeRequired') })
  } else if (!data.associate_id) {
    ctx.addIssue({
      code: 'custom',
      path: ['associate_id'],
      message: t('transaction.addModal.validation.associateIdRequired')
    })
  }
})

const { data: users } = await useFetch('https://jsonplaceholder.typicode.com/users', {
  key: 'typicode-users-email',
  transform: (data: { id: number, name: string, email: string }[]) => {
    return data?.map(user => ({
      label: user.name,
      email: user.email,
      value: String(user.id),
      avatar: { src: `https://i.pravatar.cc/120?img=${user.id}` }
    }))
  },
  lazy: true
})

type Schema = z.output<typeof schema>

const state = reactive<Partial<Schema>>({
  payment_amount: 5,
  payment_method: 'POS',
  payment_type: 'event-fee',
  payer_is_associate: true,
  payment_datetime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString().slice(0, 16) // default to now + 2 hours, formatted for datetime-local
})

// Compute the selected payment type object
const selectedPaymentType = computed(() => {
  return paymentTypeOptions.value.find(item => item.value === state.payment_type)
})

const associateDigits = ref('')

const items = computed(() => [
  {
    label: t('transaction.addModal.tabs.associate'),
    icon: 'i-lucide-user-check',
    slot: 'associate'
  },
  {
    label: t('transaction.addModal.tabs.external'),
    icon: 'i-lucide-pencil-line',
    slot: 'external'
  }
])

// Track which tab is active
const activeTab = ref(0)

// Update payer_is_associate based on tab
watch(activeTab, (newTab) => {
  state.payer_is_associate = newTab === 0
})

// Handle associate ID input
const handleAssociateIdInput = (event: Event) => {
  const input = event.target as HTMLInputElement
  // Extract only digits and limit to 3
  const digits = input.value.replace(/\D/g, '').slice(0, 3)
  associateDigits.value = digits
  state.associate_id = digits.length === 3 ? `PW-0${digits}` : ''
}

// Prevent non-numeric key presses
const onlyNumbers = (event: KeyboardEvent) => {
  const key = event.key
  // Allow control keys
  if (['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight'].includes(key)) {
    return
  }

  console.log('key pressed: ', key)

  // Prevent if not a number
  if (!/^\d$/.test(key)) {
    event.preventDefault()
  }
}

// Handle paste events
const handlePaste = (event: ClipboardEvent) => {
  event.preventDefault()
  const pastedText = event.clipboardData?.getData('text') || ''
  const digits = pastedText.replace(/\D/g, '').slice(-3)
  associateDigits.value = digits
  state.associate_id = digits.length === 3 ? `PW-0${digits}` : ''
}

// Computed property to automatically uppercase the tax code
const payerTaxCodeInput = computed({
  get: () => state.payer_tax_code,
  set: (value) => {
    state.payer_tax_code = value?.toUpperCase() || ''
  }
})

async function onSubmit(event: FormSubmitEvent<Schema>) {
  try {
    // Simulate transaction creation logic here (e.g., API call)
    // await createTransaction(event.data)

    toast.add({
      title: t('transaction.addModal.successToastTitle'),
      description: state.associate_id
        ? t('transaction.addModal.successToastDescriptionAssociate', { amount: event.data.payment_amount ?? 0, associateId: state.associate_id })
        : t('transaction.addModal.successToastDescriptionExternal', { amount: event.data.payment_amount ?? 0, name: `${event.data.payer_name ?? ''} ${event.data.payer_surname ?? ''}` }),
      color: 'success'
    })
    open.value = false
  } catch (error: unknown) {
    let message = t('transaction.addModal.errorToastGenericMessage')
    if (error instanceof Error) {
      message = error.message
    }
    toast.add({
      title: t('transaction.addModal.errorToastTitle'),
      description: message,
      color: 'error'
    })
  }
}
</script>

<template>
  <!-- TODO rendere tutte le modali dismissible="false" e content: 'max-w-2xl' -->
  <UModal
    v-model:open="open"
    :dismissible="false"
    :ui="{ content: 'max-w-xl' }"
    :title="$t('transaction.addModal.title')"
    :description="$t('transaction.addModal.description')"
  >
    <!-- Trigger button goes in the default slot -->
    <UButton
      :label="$t('transaction.addModal.openButton')"
      icon="i-lucide-coins"
      @click="() => { open = true }"
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

          <!-- Use v-model to track active tab -->
          <UTabs v-model="activeTab" :items="items">
            <template #associate>
              <div class="grid grid-cols-2 gap-2 mt-2">
                <UFormField
                  :label="$t('transaction.addModal.fields.associateId')"
                  name="associate_id"
                  required
                >
                  <UInput
                    v-model="associateDigits"
                    placeholder="000"
                    type="text"
                    inputmode="numeric"
                    pattern="[0-9]*"
                    maxlength="3"
                    class="w-full"
                    :ui="{
                      base: 'pl-17',
                      leading: 'pointer-events-none'
                    }"
                    @keypress="onlyNumbers"
                    @input="handleAssociateIdInput($event)"
                    @paste="handlePaste($event)"
                  >
                    <template #leading>
                      <div class="flex items-center gap-1.5">
                        <UIcon name="i-lucide-credit-card" class="size-4 text-muted" />
                        <p class="text-sm text-muted">
                          PW-0
                        </p>
                      </div>
                    </template>
                  </UInput>
                </UFormField>

                <UFormField
                  :label="$t('transaction.addModal.fields.member')"
                  name="associate_id"
                  required
                >
                  <UInputMenu
                    :items="users"
                    class="w-full"
                    icon="i-lucide-user"
                    :placeholder="$t('transaction.addModal.fields.selectMember')"
                    :ui="{ content: 'min-w-fit' }"
                  >
                    <template #item-label="{ item }">
                      {{ item.label }}

                      <span class="text-muted">
                        {{ item.email }}
                      </span>
                    </template>
                  </UInputMenu>
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
                    icon="i-lucide-at-sign"
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
                      <div
                        id="character-count"
                        class="text-xs text-muted tabular-nums"
                        aria-live="polite"
                        role="status"
                      >
                        {{ state.payer_tax_code?.length }}/16
                      </div>
                    </template>
                  </UInput>
                </UFormField>
              </div>
            </template>
          </UTabs>
        </div>

        <p class="text-lg font-semibold text-primary">
          {{ $t('transaction.addModal.paymentInfo') }}
        </p>

        <div class="grid grid-cols-2 gap-2 mt-2">
          <UFormField :label="$t('transaction.addModal.fields.paymentDate')" name="payment_date">
            <UInput
              v-model="state.payment_datetime"
              type="datetime-local"
              class="w-full"
              disabled
            />
          </UFormField>

          <UFormField :label="$t('transaction.addModal.fields.receivedBy')" name="received_by">
            <USelectMenu
              v-model="state.received_by"
              :items="receiverOptions"
              class="w-full"
            />
          </UFormField>

          <UFormField :label="$t('transaction.addModal.fields.paymentType')" name="payment_type">
            <USelect
              v-model="state.payment_type"
              :items="paymentTypeOptions"
              value-key="value"
              class="w-full"
            >
              <template #leading>
                <UIcon v-if="selectedPaymentType" :name="selectedPaymentType.icon" class="size-5 shrink-0" />
              </template>
            </USelect>
          </UFormField>

          <UFormField
            :label="$t('transaction.addModal.fields.paymentMethod')"
            name="payment_method"
          >
            <USelect
              v-model="state.payment_method"
              :items="paymentMethodOptions"
              class="w-full"
            />
          </UFormField>
        </div>

        <div class="grid grid-cols-2 gap-2 mt-2">
          <UFormField :label="$t('transaction.addModal.fields.receivedBy')" name="received_by">
            <USelect v-model="state.received_by" :items="receiverOptions" class="w-full" />
          </UFormField>

          <UFormField :label="$t('transaction.addModal.fields.event')" name="event_name">
            <USelectMenu
              v-model="state.event_name"
              :items="eventOptions"
              class="w-full"
            />
          </UFormField>
        </div>

        <UFormField :label="$t('transaction.addModal.fields.notes')" name="notes">
          <UTextarea v-model="state.notes" class="w-full" />
        </UFormField>

        <div class="flex justify-end gap-2">
          <UButton
            :label="$t('transaction.addModal.cancel')"
            color="neutral"
            variant="subtle"
            @click="() => { open = false }"
          />
          <UButton
            :label="$t('transaction.addModal.create')"
            color="primary"
            variant="solid"
            type="submit"
          />
        </div>
      </UForm>
    </template>
  </UModal>
</template>
