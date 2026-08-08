<!-- app\components\transactions\list\AddModal.vue -->
<script setup lang="ts">
import * as v from 'valibot'
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

// v.forward(v.partialCheck([...paths], requirement, msg), [path]) è
// l'equivalente Valibot di un .superRefine() con ctx.addIssue su un path
// specifico: partialCheck legge più campi (qui payer_is_associate + il
// campo target) per decidere se sollevare l'errore, forward lo attacca al
// campo giusto invece che alla radice dell'oggetto — un check per ciascuno
// dei 5 campi condizionali dell'originale, stessa logica 1:1.
const schema = v.pipe(
  v.object({
    associate_id: v.optional(v.string()),
    payer_is_associate: v.optional(v.boolean(), true),
    payer_name: v.optional(v.pipe(
      v.string(), v.minLength(2, t('transaction.addModal.validation.payerFirstNameTooShort'))
    )),
    payer_surname: v.optional(v.pipe(
      v.string(), v.minLength(2, t('transaction.addModal.validation.payerLastNameTooShort'))
    )),
    // trim/toLowerCase sono trasformazioni, v.email() valida il formato —
    // stesso ordine della pipeline Zod precedente.
    payer_email: v.pipe(v.string(), v.trim(), v.email(), v.toLowerCase()),
    payer_tax_code: v.optional(v.pipe(v.string(), v.trim())),
    // le date possono essere sia passate che future
    payment_datetime: v.string(),
    payment_amount: v.pipe(
      v.number(), v.minValue(0, t('transaction.addModal.validation.amountNotNegative'))
    ),
    payment_method: v.picklist(
      ['Cash', 'PayPal', 'POS', 'Bank Transfer'],
      t('transaction.addModal.validation.invalidPaymentMethod')
    ),
    received_by: v.optional(v.pipe(v.string(), v.trim())),
    payment_type: v.picklist(
      paymentTypeOptions.value.map(option => option.value),
      t('transaction.addModal.validation.invalidPaymentType')
    ),
    event_name: v.optional(v.string()),
    notes: v.optional(v.string())
  }),
  v.forward(
    v.partialCheck(
      [['payer_is_associate'], ['payer_name']],
      input => !!input.payer_is_associate || !!input.payer_name,
      t('transaction.addModal.validation.payerFirstNameRequired')
    ),
    ['payer_name']
  ),
  v.forward(
    v.partialCheck(
      [['payer_is_associate'], ['payer_surname']],
      input => !!input.payer_is_associate || !!input.payer_surname,
      t('transaction.addModal.validation.payerLastNameRequired')
    ),
    ['payer_surname']
  ),
  v.forward(
    v.partialCheck(
      [['payer_is_associate'], ['payer_email']],
      input => !!input.payer_is_associate || !!input.payer_email,
      t('transaction.addModal.validation.payerEmailRequired')
    ),
    ['payer_email']
  ),
  v.forward(
    v.partialCheck(
      [['payer_is_associate'], ['payer_tax_code']],
      input => !!input.payer_is_associate || !!input.payer_tax_code,
      t('transaction.addModal.validation.payerTaxCodeRequired')
    ),
    ['payer_tax_code']
  ),
  v.forward(
    v.partialCheck(
      [['payer_is_associate'], ['associate_id']],
      input => !input.payer_is_associate || !!input.associate_id,
      t('transaction.addModal.validation.associateIdRequired')
    ),
    ['associate_id']
  )
)

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

type Schema = v.InferOutput<typeof schema>

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
