<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
// import type { User } from '~/types'
import { CalendarDate, DateFormatter, getLocalTimeZone } from '@internationalized/date'

const df = new DateFormatter('it-IT', {
  dateStyle: 'long'
})

// Define the full schema with all fields
const schema = z.object({
  associate_type: z.enum(['Ordinario', 'Sostenitore']),
  name: z.string().min(2, 'Nome troppo corto'),
  surname: z.string().min(2, 'Cognome troppo corto'),
  email: z.string().email('Email non valida'),
  phone_number: z.string().min(10, 'Numero di telefono non valido'),
  tax_code: z.string().min(16, 'Codice fiscale non valido'),
  born_location: z.string().min(2, 'Luogo di nascita richiesto'),
  born_date: z.date({ error: 'Data di nascita richiesta' }),
  born_province: z.string().min(2, 'Provincia richiesta'),
  born_state: z.string().min(2, 'Stato richiesto'),
  residency_address: z.string().min(5, 'Indirizzo richiesto'),
  residency_city: z.string().min(2, 'Città richiesta'),
  residency_province: z.string().min(2, 'Provincia richiesta').max(2, 'Sigla provincia non valida'),
  residency_cap: z.string().regex(/^\d{5}$/, 'CAP non valido'),
  mtgo_nickname: z.string().nullable().optional(),
  mtga_nickname: z.string().nullable().optional(),
  consent_data: z.boolean().refine(val => val === true, 'Consenso obbligatorio'),
  consent_social: z.boolean().optional(),
  has_read_statute: z.boolean().refine(val => val === true, 'Lettura statuto obbligatoria'),
  has_acknowledged_surveillance_notice: z.boolean().refine(val => val === true, 'Presa visione obbligatoria')
})

const open = ref(false)

type Schema = z.output<typeof schema>

const state = reactive<Partial<Schema>>({
  associate_type: 'Ordinario',
  name: '',
  surname: '',
  email: '',
  phone_number: '',
  tax_code: '',
  born_location: '',
  born_date: undefined,
  born_province: '',
  born_state: '',
  residency_address: '',
  residency_city: '',
  residency_province: '',
  residency_cap: '',
  mtgo_nickname: null,
  mtga_nickname: null,
  has_read_statute: undefined,
  has_acknowledged_surveillance_notice: undefined,
  consent_data: undefined,
  consent_social: false
})

const toast = useToast()

// Calendar state for born_date
const calendarDate = ref<CalendarDate | null>(null)

// Sync calendar selection with state
watch(calendarDate, (newDate) => {
  if (newDate) {
    state.born_date = newDate.toDate(getLocalTimeZone())
  }
})

// Initialize calendar if state has a value
onMounted(() => {
  if (state.born_date) {
    const d = state.born_date
    calendarDate.value = new CalendarDate(d.getFullYear(), d.getMonth() + 1, d.getDate())
  }
})

async function onSubmit(event: FormSubmitEvent<Schema>) {
  console.log('Form submitted:', event.data)
  toast.add({ title: 'Successo', description: `Nuovo associato "${event.data.name} ${event.data.surname}" aggiunto`, color: 'success' })
  open.value = false
}
</script>

<template>
  <UModal
    v-model:open="open"
    :dismissible="false"
    :ui="{ content: 'max-w-2xl' }"
    title="Nuovo associato"
    description="Aggiungi un nuovo associato al database"
  >
    <UButton label="Nuovo associato" icon="i-lucide-user-plus" />

    <template #body>
      <UForm
        :schema="schema"
        :state="state"
        class="space-y-4"
        @submit="onSubmit"
      >
        <!-- eslint-disable -->
        <!-- Tipologia associato -->
        <div>
          <h3 class="text-lg font-semibold text-primary">Tipologia di associato</h3>
          <div class="grid grid-cols-2 gap-2 mt-2">
            <UFormField label="Tipo di associato" name="associate_type">
              <USelect v-model="state.associate_type" :options="['Ordinario', 'Sostenitore']" class="w-full" />
            </UFormField>
          </div>
        </div>

        <!-- Informazioni personali -->
        <div id="personal-info-section">
          <h3 class="text-lg font-semibold text-primary">Informazioni personali</h3>
          <div class="grid grid-cols-2 gap-2 mt-2">
            <UFormField label="Nome" name="name" required>
              <UInput v-model="state.name" autocomplete="given-name" class="w-full" />
            </UFormField>
            <UFormField label="Cognome" name="surname" required>
              <UInput v-model="state.surname" autocomplete="family-name" class="w-full" />
            </UFormField>
            <UFormField label="Email" name="email" required>
              <UInput v-model="state.email" autocomplete="email" class="w-full" />
            </UFormField>
            <UFormField label="Numero di cellulare" name="phone_number" required>
              <UInput v-model="state.phone_number" autocomplete="tel" class="w-full" />
            </UFormField>
          </div>
        </div>

        <!-- Informazioni di nascita -->
        <div id="birth-section">
          <h3 class="text-lg font-semibold text-primary">Informazioni di nascita</h3>
          <div class="grid grid-cols-2 gap-2 mt-2">
            <UFormField label="Luogo" name="born_location" required>
              <UInput v-model="state.born_location" class="w-full" />
            </UFormField>

            <UFormField label="Data di nascita" name="born_date" required>
              <!-- Input nascosto per autofill e validazione Zod -->
              <input
                type="date"
                v-model="state.born_date"
                name="born_date"
                autocomplete="bday"
                class="hidden"
              />

              <!-- Pulsante calendario -->
              <UPopover>
                <UButton
                  color="neutral"
                  variant="outline"
                  class="w-full justify-start"
                  icon="i-lucide-calendar"
                >
                  {{ state.born_date ? df.format(state.born_date) : 'Seleziona data di nascita' }}
                </UButton>

                <template #content>
                  <UCalendar
                    v-model="calendarDate"
                    :default-value="new CalendarDate(1995, 1, 1)"
                    class="p-2"
                  />
                </template>
              </UPopover>
            </UFormField>

            <UFormField label="Provincia" name="born_province" required>
              <UInput v-model="state.born_province" class="w-full" />
            </UFormField>
            <UFormField label="Stato" name="born_state" required>
              <UInput v-model="state.born_state" class="w-full" />
            </UFormField>
          </div>
        </div>

        <!-- Informazioni fiscali -->
        <div id="fiscal-section">
          <h3 class="text-lg font-semibold text-primary">Informazioni fiscali</h3>
          <div class="grid grid-cols-2 gap-2 mt-2">
            <UFormField label="Codice Fiscale" name="tax_code" required>
              <UInput v-model="state.tax_code" class="w-full" />
            </UFormField>
          </div>
        </div>

        <!-- Residenza -->
        <div id="residency-section">
          <h3 class="text-lg font-semibold text-primary">Informazioni sulla residenza</h3>
          <div class="grid grid-cols-2 gap-2 mt-2">
            <UFormField label="Indirizzo" name="residency_address" required>
              <UInput v-model="state.residency_address" autocomplete="address-line1" class="w-full" />
            </UFormField>
            <UFormField label="Città" name="residency_city" required>
              <UInput v-model="state.residency_city" autocomplete="address-line2" class="w-full" />
            </UFormField>
            <UFormField label="Provincia" name="residency_province" required>
              <UInput v-model="state.residency_province" autocomplete="state" class="w-full" />
            </UFormField>
            <UFormField label="CAP" name="residency_cap" required>
              <UInput v-model="state.residency_cap" autocomplete="postal-code" class="w-full" />
            </UFormField>
          </div>
        </div>

        <!-- Nickname MTG -->
        <div id="mtg-nicknames-section">
          <h3 class="text-lg font-semibold text-primary">Nickname MTG</h3>
          <div class="grid grid-cols-2 gap-2 mt-2">
            <UFormField label="MTGO" name="mtgo_nickname">
              <UInput v-model="state.mtgo_nickname" class="w-full" />
            </UFormField>
            <UFormField label="Arena" name="mtga_nickname">
              <UInput v-model="state.mtga_nickname" class="w-full" />
            </UFormField>
          </div>
        </div>

        <!-- Consensi -->
        <div id="consents-section">
          <h3 class="text-lg font-semibold text-primary">Consensi e riconoscimenti</h3>
          <div class="mt-2 space-y-2">
            <UFormField name="has_read_statute">
              <UCheckbox
                v-model="state.has_read_statute"
                default-value="indeterminate"
                required
                label="Ho letto lo statuto dell'associazione"
                size="lg"
              >
                <template #description>
                  Dichiaro di aver letto lo statuto dell'associazione.
                </template>
              </UCheckbox>
            </UFormField>
            <UFormField name="has_acknowledged_surveillance_notice">
              <UCheckbox
                v-model="state.has_acknowledged_surveillance_notice"
                default-value="indeterminate"
                required
                label="Informativa sulla sorveglianza"
                size="lg"
              >
                <template #description>
                  Dichiaro di aver preso visione dell'informativa sulla sorveglianza.
                </template>
              </UCheckbox>
            </UFormField>
            <UFormField name="consent_data">
              <UCheckbox
                v-model="state.consent_data"
                default-value="indeterminate"
                required
                label="Consenso al trattamento dei dati"
                size="lg"
              >
                <template #description>
                  Dichiaro di aver preso visione dell'informativa sul trattamento dei dati.
                </template>
              </UCheckbox>
            </UFormField>
            <UFormField name="consent_social">
              <UCheckbox
                v-model="state.consent_social"
                label="Consenso Social"
                size="lg"
              >
                <template #description>
                  Dichiaro di aver preso visione dell'informativa sulla privacy.
                </template>
              </UCheckbox>
            </UFormField>
          </div>
        </div>

        <!-- Azioni -->
        <div class="flex justify-end gap-2">
          <UButton
            label="Annulla"
            color="neutral"
            variant="subtle"
            @click="open = false"
          />
          <UButton
            label="Crea"
            color="primary"
            variant="solid"
            type="submit"
          />
        </div>
      </UForm>
    </template>
  </UModal>
</template>
