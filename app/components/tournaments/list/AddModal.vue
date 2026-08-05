<script setup lang="ts">
import { CalendarDate } from '@internationalized/date'
import type { DateValue } from '@internationalized/date'
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'

const open = defineModel<boolean>({ default: false })
const toast = useToast()

const visibilityOptions = [
  { value: 'public', label: 'Pubblico', icon: 'i-lucide-eye' },
  { value: 'private', label: 'Privato', icon: 'i-lucide-eye-off' }
]

const statusOptions = [
  { value: 'scheduled', label: 'Pianificato', icon: 'i-lucide-clock', color: 'info' },
  { value: 'cancelled', label: 'Annullato', icon: 'i-lucide-circle-x', color: 'error' },
  { value: 'ongoing', label: 'In corso', icon: 'i-lucide-circle-dot-dashed', color: 'warning' },
  { value: 'completed', label: 'Completato', icon: 'i-lucide-circle-check-big', color: 'success' }
]

const formatOptions = [
  'Standard',
  'Modern',
  'Pioneer',
  'Commander',
  'Legacy',
  'Vintage',
  'Pauper'
]

const organizerOptions = [
  'Magman',
  'Pauperwave',
  'Commanderwave',
  'MagicCorner'
]

const placeOptions = [
  'Magazzino Fantasia',
  'Bruno',
  'Magman'
]

const rulesetOptions = [
  'REL Regular',
  'REL Competitive',
  'REL Professional'
]

const leagueOptions = [
  'Magman Autunno 2025',
  'Magman Primavera 2025',
  'Magman Estate 2025',
  'Magman Inverno 2025'
]

const eventOptions = [
  'CommanderFest',
  'CommanderFest Summer'
]

// Get today's date
const today = new Date()
const todayString = today.toISOString().substring(0, 10) // Format as YYYY-MM-DD

const schema = z.object({
  status: z.string(),
  visibility: z.string(),
  companion_code: z.string().optional().nullable(),
  name: z.string({
    error: 'Il nome del torneo è obbligatorio'
  }).optional(),
  description: z.string().optional().nullable(),
  entry_fee: z.number().nonnegative(),
  format: z.string(),
  ruleset: z.string(),
  start_date: z.string(),
  start_time: z.string(),
  round_count: z.number().int().positive(),
  round_duration: z.number().int().positive(),
  organizer: z.string(),
  location: z.string(),
  league: z.string().optional(),
  event: z.string().optional()
})

type Schema = z.output<typeof schema>

const state = reactive<Schema>({
  name: undefined,
  ruleset: 'REL Regular',
  status: 'scheduled',
  start_date: todayString,
  visibility: 'private',
  start_time: '20:00',
  round_count: 2,
  round_duration: 60,
  league: undefined,
  event: undefined,
  format: 'Commander',
  description: undefined,
  organizer: 'Pauperwave',
  location: 'Magazzino Fantasia',
  entry_fee: 5,
  companion_code: undefined
})

// Initialize CalendarDate from today - use shallowRef with proper type
const startDate = shallowRef<DateValue>(
  new CalendarDate(today.getFullYear(), today.getMonth() + 1, today.getDate())
)

// Watch for changes to startDate and update state.start_date
watch(startDate, (newDate) => {
  if (newDate) {
    // Format as YYYY-MM-DD
    state.start_date = `${newDate.year}-${String(newDate.month).padStart(2, '0')}-${String(newDate.day).padStart(2, '0')}`
  }
})

const formattedStartDate = computed(() => {
  if (!startDate.value) return ''
  const date = new Date(startDate.value.year, startDate.value.month - 1, startDate.value.day)
  return date.toLocaleDateString('it-IT', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  })
})

// Computed property to get the selected visibility object
const selectedVisibility = computed(() => {
  return visibilityOptions.find(option => option.value === state.visibility)
})

// Computed property to get the selected status object
const selectedStatus = computed(() => {
  return statusOptions.find(option => option.value === state.status)
})

async function onSubmit(event: FormSubmitEvent<Schema>) {
  // Simulate API call
  await new Promise(resolve => setTimeout(resolve, 1000))
  console.log('New tournament data:', event.data)

  // Show success toast
  toast.add({
    title: 'Success',
    description: `Nuovo torneo "${event.data.name}" aggiunto`,
    color: 'success'
  })

  // Close modal
  open.value = false
}
</script>

<template>
  <UModal
    v-model:open="open"
    :dismissible="false"
    :ui="{ content: 'max-w-xl' }"
    title="Nuovo torneo"
    description="Aggiungi un nuovo torneo al database"
  >
    <UButton label="Nuovo torneo" icon="i-lucide-swords" @click="open = true" />

    <template #body>
      <UForm
        :schema="schema"
        :state="state"
        class="space-y-6"
        @submit="onSubmit"
      >
        <!-- Dati relativi all'evento -->
        <div class="space-y-4">
          <p class="text-lg font-semibold text-primary">
            Dati relativi al torneo
          </p>

          <div class="flex justify-between gap-2">
            <UFormField label="Stato" class="flex-1" name="status">
              <USelect
                v-model="state.status"
                :items="statusOptions"
                value-key="value"
                class="w-full"
              >
                <template #leading>
                  <UIcon v-if="selectedStatus" :name="selectedStatus.icon" class="size-5 shrink-0" />
                </template>
              </USelect>
            </UFormField>

            <UFormField label="Visibilità" class="flex-1" name="visibility">
              <USelect
                v-model="state.visibility"
                :items="visibilityOptions"
                value-key="value"
                class="w-full"
              >
                <template #leading>
                  <UIcon v-if="selectedVisibility" :name="selectedVisibility.icon" class="size-5 shrink-0" />
                </template>
              </USelect>
            </UFormField>

            <UFormField label="Codice Companion" name="companion_code">
              <UInput
                :model-value="state.companion_code ?? ''"
                placeholder="Codice (opzionale)"
                icon="i-lucide-smartphone"
                class="w-42"
                @update:model-value="state.companion_code = ($event as string) || undefined"
              />
            </UFormField>
          </div>

          <div class="flex items-end gap-2">
            <!-- eslint-disable-next-line -->
            <UFormField label="Nome" name="name" class="flex-1" required>
              <UInput
                v-model="state.name"
                class="w-full"
                placeholder="Nome del torneo"
                icon="i-lucide-trophy"
              />
            </UFormField>

            <UFormField label="Quota (€)" name="entry_fee">
              <UInputNumber
                v-model="state.entry_fee"
                :min="0"
                :step="5"
                class="w-42"
                icon="i-lucide-euro"
              />
            </UFormField>
          </div>

          <UFormField label="Descrizione" name="description">
            <UTextarea
              :model-value="state.description ?? ''"
              class="w-full"
              placeholder="Descrizione (opzionale)"
              icon="i-lucide-align-left"
              @update:model-value="state.description = ($event as string) || undefined"
            />
          </UFormField>

          <div class="grid grid-cols-2 gap-4">
            <UFormField label="Formato" name="format">
              <USelectMenu
                v-model="state.format"
                class="w-full"
                :items="formatOptions"
                placeholder="Seleziona formato"
                icon="i-lucide-layers"
              />
            </UFormField>

            <UFormField label="Regolamento" name="ruleset">
              <USelect
                v-model="state.ruleset"
                class="w-full"
                :items="rulesetOptions"
                placeholder="Seleziona regolamento"
                icon="i-lucide-book-open"
              />
            </UFormField>
          </div>

          <p class="text-lg font-semibold text-primary">
            Pianificazione del torneo
          </p>

          <div class="grid grid-cols-2 gap-4">
            <div class="flex justify-between gap-2">
              <UFormField label="Data di inizio" class="flex-1" name="start_date">
                <UPopover>
                  <UInput
                    :model-value="formattedStartDate"
                    readonly
                    class="w-full"
                    icon="i-lucide-calendar"
                  />

                  <template #content>
                    <UCalendar v-model="startDate" class="p-2" />
                  </template>
                </UPopover>
              </UFormField>

              <UFormField label="Ora di inizio" name="start_time">
                <UTimePicker
                  v-model="state.start_time"
                  placeholder="Seleziona orario"
                  :minute-step="15"
                />
              </UFormField>
            </div>

            <div class="flex gap-2">
              <UFormField label="Numero di round" name="round_count">
                <UInputNumber
                  v-model="state.round_count"
                  :min="1"
                  icon="i-lucide-hash"
                />
              </UFormField>

              <UFormField label="Durata round" name="round_duration">
                <UInputNumber
                  v-model="state.round_duration"
                  :step="5"
                  icon="i-lucide-timer"
                />
              </UFormField>
            </div>
          </div>

          <!-- Dati dell'organizzatore -->
          <p class="text-lg font-semibold text-primary">
            Dati relativi all'organizzatore
          </p>

          <div class="grid grid-cols-2 gap-4">
            <UFormField label="Organizzatore" name="organizer">
              <USelect
                v-model="state.organizer"
                class="w-full"
                :items="organizerOptions"
                placeholder="Seleziona organizzatore"
                icon="i-lucide-user"
              />
            </UFormField>

            <UFormField label="Luogo" name="location">
              <USelect
                v-model="state.location"
                class="w-full"
                :items="placeOptions"
                placeholder="Seleziona luogo"
                icon="i-lucide-map-pin"
              />
            </UFormField>

            <UFormField label="Lega" name="league">
              <USelectMenu
                v-model="state.league"
                class="w-full"
                :items="leagueOptions"
                placeholder="Associa lega (opzionale)"
                icon="i-lucide-trophy"
              >
                <template #trailing>
                  <UButton
                    v-if="state.league"
                    class="cursor-pointer"
                    color="neutral"
                    variant="ghost"
                    size="xs"
                    icon="i-lucide-circle-x"
                    @click="state.league = ''"
                  />
                </template>
              </USelectMenu>
            </UFormField>

            <UFormField label="Evento" name="event">
              <USelectMenu
                v-model="state.event"
                class="w-full"
                :items="eventOptions"
                placeholder="Associa evento (opzionale)"
                icon="i-lucide-calendar-arrow-up"
              >
                <template #trailing>
                  <UButton
                    v-if="state.event"
                    class="cursor-pointer"
                    color="neutral"
                    variant="ghost"
                    size="xs"
                    icon="i-lucide-circle-x"
                    @click="state.event = ''"
                  />
                </template>
              </USelectMenu>
            </UFormField>
          </div>
        </div>

        <!-- Action buttons -->
        <div class="flex justify-end gap-2 pt-4">
          <UButton
            label="Annulla"
            color="neutral"
            variant="ghost"
            @click="open = false"
          />
          <UButton
            label="Crea torneo"
            icon="i-lucide-check"
            type="submit"
          />
        </div>
      </UForm>
    </template>
  </UModal>
</template>
