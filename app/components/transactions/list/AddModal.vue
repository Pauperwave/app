<script setup lang="ts">
import * as z from 'zod'
import { format } from 'date-fns'
import type { FormSubmitEvent } from '@nuxt/ui'

const schema = z.object({
  associate_id: z.number().int().positive().optional(),
  payer_is_associate: z.boolean().optional(),
  payer_name: z.string().min(2).optional(),
  payer_surname: z.string().min(2).optional(),
  payer_email: z.string().email().optional(),
  payer_tax_code: z.string().optional(),
  payment_date: z.string().optional(),
  payment_amount: z.number().nonnegative().optional(),
  payment_method: z.enum(['Cash', 'Card', 'Bank Transfer', 'Other']).optional(),
  received_by: z.string().optional(),
  payment_type: z.enum(['Donation', 'Membership', 'Purchase', 'Other']).optional(),
  event_name: z.string().optional(),
  notes: z.string().optional(),
  name: z.string().min(2, 'Too short'),
  email: z.string().email('Invalid email address')
}).refine((data) => {
  // If the payer is not an associate, ensure name, surname, email and tax code are provided
  if (!data.payer_is_associate) {
    return data.payer_name
      && data.payer_surname
      && data.payer_email
      && data.payer_tax_code
  }
  return true
}, { message: 'Provide payer name, surname, email and tax code if not associate' })

type Schema = z.infer<typeof schema>

// Utility function to get today's date in DD/MM/YYYY format
function getTodayISOString(): string {
  return format(new Date(), 'yyyy-MM-dd\'T\'HH:mm')
}

const state = reactive<Partial<Schema>>({
  payer_is_associate: false,
  payment_date: getTodayISOString()
})

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
                v-for="field in [
                  { label: 'Nome', name: 'payer_name', type: 'text' },
                  { label: 'Cognome', name: 'payer_surname', type: 'text' },
                  { label: 'Email', name: 'payer_email', type: 'email' },
                  { label: 'Codice Fiscale', name: 'payer_tax_code', type: 'text' }
                ]"
                :key="field.name"
                :label="field.label"
                :name="field.name"
              >
                <UInput v-model="state[field.name]" :type="field.type" class="w-full" />
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
