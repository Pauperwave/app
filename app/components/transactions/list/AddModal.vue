<script setup lang="ts">
import * as z from 'zod'
import { format } from 'date-fns'
import type { FormSubmitEvent } from '@nuxt/ui'

const schema = z.object({
  associate_id: z.number().int().positive().optional(),
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
  payment_date: z.date(),
  payment_amount: z.number().nonnegative({
    message: 'L\'importo non può essere negativo'
  }),
  payment_method: z.enum(['Cash', 'Card', 'Bank Transfer', 'Other'], {
    message: 'Metodo di pagamento non valido'
  }),
  received_by: z.string().trim().optional(),
  payment_type: z.enum(['Donation', 'Membership', 'Purchase', 'Other'], {
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

type Schema = z.output<typeof schema>

// Utility function to get today's date in DD/MM/YYYY format
function getTodayISOString(): string {
  return format(new Date(), 'yyyy-MM-dd\'T\'HH:mm')
}

const state = reactive<Partial<Schema>>({
  payer_is_associate: false,
  payment_date: getTodayISOString()
})

watch(() => state.payer_is_associate, (isAssociate) => {
  if (isAssociate) {
    state.payer_name = ''
    state.payer_surname = ''
    state.payer_email = ''
    state.payer_tax_code = ''
  } else {
    state.associate_id = undefined
  }
})

const payerFields = [
  { label: 'Nome', name: 'payer_name', type: 'text' },
  { label: 'Cognome', name: 'payer_surname', type: 'text' },
  { label: 'Email', name: 'payer_email', type: 'email' },
  { label: 'Codice Fiscale', name: 'payer_tax_code', type: 'text' }
]

const open = ref(false)
const toast = useToast()

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
  <UModal
    v-model:open="open"
    :dismissible="false"
    :ui="{ content: 'max-w-2xl' }"
    :state="state"
    validate-on="input"
    title="Nuova transazione"
    description="Aggiungi una nuova transazione al database"
  >
    <UButton label="Nuova transazione" icon="i-lucide-banknote-arrow-down" />

    <template #body>
      <UForm
        :schema="schema"
        :state="state"
        class="space-y-2"
        @submit="onSubmit"
      >
        <!-- eslint-disable -->
        <div>
          <h3 class="text-lg font-semibold text-primary">Informazioni personali</h3>
            <UFormField label="Associato" name="payer_is_associate">
              <USwitch
                v-model="state.payer_is_associate"
                size="xl"
                :ui="{ base: 'rounded-md', thumb: 'rounded-sm' }"
              />
            </UFormField>
            <div class="grid grid-cols-2 gap-2 mt-2 min-h-[120px]">
              <template v-if="state.payer_is_associate">
              <UFormField label="Associate ID" name="associate_id">
                <UInput v-model="state.associate_id" type="number" class="w-full" />
              </UFormField>
              <div class="col-span-1"></div>
              <div class="col-span-2"></div>
              </template>
              <template v-else>
              <UFormField
                v-for="f in payerFields"
                :key="f.name"
                :label="f.label"
                :name="f.name"
              >
                <UInput v-model="state[f.name]" :type="f.type" class="w-full" />
              </UFormField>
              </template>
            </div>
        </div>
        <h3 class="text-lg font-semibold text-primary">Informazioni sul pagamento</h3>
        <div class="grid grid-cols-2 gap-2 mt-2">
          <UFormField label="Data pagamento" name="payment_date">
            <UInput v-model="state.payment_date" type="datetime-local" class="w-full" />
          </UFormField>
          <UFormField label="Payment Type" name="payment_type">
            <USelect
              v-model="state.payment_type"
              :options="['Donation', 'Association Fee', 'Event Fee']"
              class="w-full"
            />
          </UFormField>
          <UFormField label="Importo" name="payment_amount">
            <UInput v-model="state.payment_amount" type="number" step="5.00" class="w-full" />
          </UFormField>
          <UFormField label="Metodo di Pagamento" name="payment_method">
            <USelect
              v-model="state.payment_method"
              :options="['Cash', 'PayPal', 'POS', 'Bank Transfer']"
              class="w-full"
            />
          </UFormField>
        </div>
        <div class="grid grid-cols-2 gap-2 mt-2">
          <UFormField label="Incassati da" name="received_by">
            <UInput v-model="state.received_by" class="w-full" />
          </UFormField>
          <UFormField label="Event Name" name="event_name">
            <UInput v-model="state.event_name" class="w-full" />
          </UFormField>
        </div>
        <UFormField label="Notes" name="notes">
          <UTextarea v-model="state.notes" class="w-full" />
        </UFormField>
        <!--  -->
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
