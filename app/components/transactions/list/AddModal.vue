<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'

// Define the model to accept open state from parent
const open = defineModel<boolean>({ default: false })
const toast = useToast()

const schema = z.object({
  associate_id: z.string().optional(),
  payer_is_associate: z.boolean().default(true),
  payer_name: z.string().min(2, { message: 'Nome troppo corto' }).optional(),
  payer_surname: z.string().min(2, { message: 'Cognome troppo corto' }).optional(),
  // https://github.com/colinhacks/zod/issues/4642#issuecomment-2957508997
  // - trim per rimuovere spazi
  // - email per validare il formato
  // - toLowerCase per normalizzare
  payer_email: z.string().check(z.trim(), z.email(), z.toLowerCase()),
  payer_tax_code: z.string().trim().optional(),
  // le date possono essere sia passate che future
  payment_datetime: z.string(),
  payment_amount: z.number().nonnegative({
    message: 'L\'importo non può essere negativo'
  }),
  payment_method: z.enum(['Cash', 'PayPal', 'POS', 'Bank Transfer'], {
    message: 'Metodo di pagamento non valido'
  }),
  received_by: z.string().trim().optional(),
  payment_type: z.enum(['Donation', 'Membership', 'Event Fee'], {
    message: 'Tipo di pagamento non valido'
  }),
  event_name: z.string().optional(),
  notes: z.string().optional()
}).superRefine((data, ctx) => {
  if (!data.payer_is_associate) {
    if (!data.payer_name) ctx.addIssue({ code: 'custom', path: ['payer_name'], message: 'Nome richiesto' })
    if (!data.payer_surname) ctx.addIssue({ code: 'custom', path: ['payer_surname'], message: 'Cognome richiesto' })
    if (!data.payer_email) ctx.addIssue({ code: 'custom', path: ['payer_email'], message: 'Email richiesta' })
    if (!data.payer_tax_code) ctx.addIssue({ code: 'custom', path: ['payer_tax_code'], message: 'Codice Fiscale richiesto' })
  } else if (!data.associate_id) {
    ctx.addIssue({
      code: 'custom',
      path: ['associate_id'],
      message: 'ID associato richiesto'
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
  payer_is_associate: true,
  payment_datetime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString().slice(0, 16) // default to now + 2 hours, formatted for datetime-local
})

const associateDigits = ref('')

const items = [
  {
    label: 'Associato',
    icon: 'i-lucide-user-check',
    slot: 'associate'
  },
  {
    label: 'Persona esterna',
    icon: 'i-lucide-pencil-line',
    slot: 'external'
  }
]

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

async function onSubmit(event: FormSubmitEvent<Schema>) {
  try {
    // Simulate transaction creation logic here (e.g., API call)
    // await createTransaction(event.data)

    toast.add({
      title: 'Successo',
      description: state.associate_id
        ? `Nuova transazione di ${event.data.payment_amount ?? 0}€ dall'associato #${state.associate_id} aggiunta`
        : `Nuova transazione di ${event.data.payment_amount ?? 0}€ da ${event.data.payer_name ?? ''} ${event.data.payer_surname ?? ''} aggiunta`,
      color: 'success'
    })
    open.value = false
  } catch (error: unknown) {
    let message = 'Impossibile aggiungere la transazione'
    if (error instanceof Error) {
      message = error.message
    }
    toast.add({
      title: 'Errore',
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
    title="Nuova transazione"
    description="Aggiungi una nuova transazione al database"
  >
    <!-- Trigger button goes in the default slot -->
    <UButton label="Nuova transazione" icon="i-lucide-coins" @click="open = true" />

    <template #body>
      <UForm
        :schema="schema"
        :state="state"
        class="space-y-2"
        @submit="onSubmit"
      >
        <div class="space-y-1">
          <p class="text-lg font-semibold text-primary">
            Informazioni personali
          </p>

          <!-- Use v-model to track active tab -->
          <UTabs v-model="activeTab" :items="items">
            <template #associate>
              <div class="grid grid-cols-2 gap-2 mt-2">
                <UFormField label="ID Associato" name="associate_id" required>
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

                <UFormField label="Socio" name="associate_id" required>
                  <UInputMenu
                    :items="users"
                    class="w-full"
                    icon="i-lucide-user"
                    placeholder="Seleziona un socio"
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
                <UFormField label="Nome" name="payer_name" required>
                  <UInput
                    v-model="state.payer_name"
                    type="text"
                    class="w-full"
                    color="neutral"
                  >
                    <template v-if="state.payer_name?.length" #trailing>
                      <UButton
                        color="neutral"
                        variant="link"
                        size="sm"
                        icon="i-lucide-circle-x"
                        aria-label="Clear input"
                        @click="state.payer_name = ''"
                      />
                    </template>
                  </UInput>
                </UFormField>

                <UFormField label="Cognome" name="payer_surname" required>
                  <UInput
                    v-model="state.payer_surname"
                    type="text"
                    class="w-full"
                    color="neutral"
                  >
                    <template v-if="state.payer_surname?.length" #trailing>
                      <UButton
                        color="neutral"
                        variant="link"
                        size="sm"
                        icon="i-lucide-circle-x"
                        aria-label="Clear input"
                        @click="state.payer_surname = ''"
                      />
                    </template>
                  </UInput>
                </UFormField>

                <UFormField label="Email" name="payer_email" required>
                  <UInput
                    v-model="state.payer_email"
                    type="email"
                    class="w-full"
                    color="neutral"
                    placeholder="Inserisci la tua email"
                    icon="i-lucide-at-sign"
                  >
                    <template v-if="state.payer_email?.length" #trailing>
                      <UButton
                        color="neutral"
                        variant="link"
                        size="sm"
                        icon="i-lucide-circle-x"
                        aria-label="Clear input"
                        @click="state.payer_email = ''"
                      />
                    </template>
                  </UInput>
                </UFormField>

                <UFormField label="Codice Fiscale" name="payer_tax_code" required>
                  <UInput
                    v-model="state.payer_tax_code"
                    type="text"
                    class="w-full"
                    color="neutral"
                  >
                    <template v-if="state.payer_tax_code?.length" #trailing>
                      <UButton
                        color="neutral"
                        variant="link"
                        size="sm"
                        icon="i-lucide-circle-x"
                        aria-label="Clear input"
                        @click="state.payer_tax_code = ''"
                      />
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
          Informazioni sul pagamento
        </p>

        <div class="grid grid-cols-2 gap-2 mt-2">
          <UFormField label="Data pagamento" name="payment_date">
            <UInput
              v-model="state.payment_datetime"
              type="datetime-local"
              class="w-full"
              disabled
            />
          </UFormField>
          <UFormField label="Tipologia di pagamento" name="payment_type">
            <USelect
              v-model="state.payment_type"
              :items="['Donation', 'Membership', 'Event Fee']"
              class="w-full"
            />
          </UFormField>
          <UFormField label="Importo" name="payment_amount">
            <UInputNumber
              v-model="state.payment_amount"
              class="w-full"
              :min="0"
              :step="5"
              icon="i-lucide-euro"
            />
          </UFormField>
          <UFormField label="Metodo di Pagamento" name="payment_method">
            <USelect
              v-model="state.payment_method"
              :items="['Cash', 'PayPal', 'POS', 'Bank Transfer']"
              class="w-full"
            />
          </UFormField>
        </div>

        <div class="grid grid-cols-2 gap-2 mt-2">
          <UFormField label="Incassati da" name="received_by">
            <UInput v-model="state.received_by" class="w-full" />
          </UFormField>
          <UFormField label="Evento" name="event_name">
            <UInput v-model="state.event_name" class="w-full" />
          </UFormField>
        </div>

        <UFormField label="Note" name="notes">
          <UTextarea v-model="state.notes" class="w-full" />
        </UFormField>

        <div class="flex justify-end gap-2">
          <UButton
            label="Cancel"
            color="neutral"
            variant="subtle"
            @click="open = false"
          />
          <UButton
            label="Create"
            color="primary"
            variant="solid"
            type="submit"
          />
        </div>
      </UForm>
    </template>
  </UModal>
</template>
