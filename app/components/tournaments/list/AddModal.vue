<script setup lang="ts">
import { CalendarDate } from '@internationalized/date'
import type { DateValue } from '@internationalized/date'
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'

const open = defineModel<boolean>({ default: false })
const toast = useToast()

const statusOptions = [
  { value: 'scheduled', label: 'Pianificato', icon: 'i-lucide-clock' },
  { value: 'postponed', label: 'Posticipato', icon: 'i-lucide-circle-pause' },
  { value: 'cancelled', label: 'Annullato', icon: 'i-lucide-circle-x' },
  { value: 'ongoing', label: 'In corso', icon: 'i-lucide-circle-dot-dashed' },
  { value: 'completed', label: 'Completato', icon: 'i-lucide-circle-check-big' }
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
  'REL Competitive',
  'REL Regular',
  'REL Casual'
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
const todayString = today.toISOString().split('T')[0]

const schema = z.object({
  name: z.string({
    error: 'Il nome del torneo è obbligatorio'
  }),
  ruleset: z.string().min(2, 'Il regolamento deve essere almeno di 2 caratteri'),
  status: z.string().optional(),
  start_date: z.string().optional(),
  start_time: z.string().optional(),
  round_count: z.number().int().positive().optional(),
  round_duration: z.number().int().positive().optional(),
  registered_players: z.number().int().nonnegative().optional(),
  league: z.string().optional().nullable().default(null),
  event: z.string().optional().nullable().default(null),
  format: z.string().optional(),
  organizer: z.string().optional(),
  location: z.string().optional(),
  entry_fee: z.number().nonnegative().optional(),
  companion_code: z.string().optional().nullable()
})

type Schema = z.output<typeof schema>

const state = reactive<Partial<Schema>>({
  name: undefined,
  ruleset: 'REL Regular',
  status: 'scheduled',
  start_date: todayString,
  start_time: '20:00',
  round_count: 2,
  round_duration: 60,
  league: null,
  event: null,
  format: 'Commander',
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

// Computed property to get the selected status object
const selectedStatus = computed(() => {
  return statusOptions.find(option => option.value === state.status)
})

async function onSubmit(event: FormSubmitEvent<Schema>) {
  toast.add({
    title: 'Success',
    description: `Nuovo torneo "${event.data.name}" aggiunto`,
    color: 'success'
  })
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

          <UFormField label="Codice Companion" name="companion_code">
            <UInput
              v-model="state.companion_code"
              placeholder="Codice (opzionale)"
              icon="i-lucide-smartphone"
              maxlength="7"
              pattern="[A-Z0-9]{0,7}"
            />
          </UFormField>

          <div class="grid grid-cols-2 gap-4">
            <UFormField label="Nome" name="name" required>
              <UInput
                v-model="state.name"
                class="w-full"
                placeholder="Nome del torneo"
                icon="i-lucide-trophy"
              />
            </UFormField>

            <div class="flex gap-4">
              <UFormField label="Stato" name="status">
                <USelectMenu
                  v-model="state.status"
                  :items="statusOptions"
                  value-key="value"
                  placeholder="Seleziona stato"
                >
                  <template #leading>
                    <UIcon v-if="selectedStatus" :name="selectedStatus.icon" class="size-5 shrink-0" />
                  </template>
                </USelectMenu>
              </UFormField>

              <UFormField label="Quota (€)" name="entry_fee">
                <UInputNumber
                  v-model="state.entry_fee"
                  :min="0"
                  :step="5"
                  icon="i-lucide-euro"
                />
              </UFormField>
            </div>

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
              <USelectMenu
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
            <div class="flex gap-4">
              <UFormField label="Data di inizio" name="start_date">
                <UPopover>
                  <UInput
                    :model-value="formattedStartDate"
                    readonly
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

            <div class="flex gap-4">
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
              <USelectMenu
                v-model="state.organizer"
                class="w-full"
                :items="organizerOptions"
                placeholder="Seleziona organizzatore"
                icon="i-lucide-user"
              />
            </UFormField>

            <UFormField label="Luogo" name="location">
              <USelectMenu
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
                    icon="i-lucide-circle-x"
                    size="xs"
                    variant="ghost"
                    @click.stop="state.league = null"
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
                    icon="i-lucide-circle-x"
                    size="xs"
                    variant="ghost"
                    @click.stop="state.event = null"
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
