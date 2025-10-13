<script setup lang="ts">
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

// Get today's date in YYYY-MM-DD format
const today = new Date().toISOString().split('T')[0]

const schema = z.object({
  name: z.string().min(2, 'Il nome deve essere almeno di 2 caratteri'),
  ruleset: z.string().min(2, 'Il regolamento deve essere almeno di 2 caratteri'),
  status: z.string().optional(),
  start_date: z.string().optional(),
  start_time: z.string().optional(),
  round_count: z.number().int().positive().optional(),
  round_duration: z.number().int().positive().optional(),
  registered_players: z.number().int().nonnegative().optional(),
  league: z.string().optional(),
  format: z.string().optional(),
  organizer: z.string().optional(),
  location: z.string().optional(),
  entry_fee: z.number().nonnegative().optional(),
  companion_code: z.string().optional()
})

type Schema = z.output<typeof schema>

const state = reactive<Partial<Schema>>({
  name: undefined,
  ruleset: 'REL Regular', // Default value
  status: 'scheduled', // Default to 'scheduled'
  start_date: today, // Default to today
  start_time: undefined,
  round_count: 2, // Default value
  round_duration: 60, // Default value
  registered_players: 0,
  league: undefined,
  format: undefined,
  organizer: 'Pauperwave', // Default value
  location: undefined,
  entry_fee: 5, // Default value
  companion_code: undefined
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
  <!-- Trigger button OUTSIDE the modal -->
  <UButton label="Nuovo torneo" icon="i-lucide-swords" @click="open = true" />

  <UModal
    v-model:open="open"
    :dismissible="false"
    :ui="{ content: 'max-w-2xl' }"
    title="Nuovo torneo"
    description="Aggiungi un nuovo torneo al database"
  >
    <template #body>
      <UForm
        :schema="schema"
        :state="state"
        class="space-y-6"
        @submit="onSubmit"
      >
        <!-- Dati relativi all'evento -->
        <div class="space-y-4">
          <h3 class="text-lg font-semibold text-primary">
            Dati relativi all'evento
          </h3>

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

          <div class="grid grid-cols-2 gap-4">
            <UFormField label="Nome" name="name" required>
              <UInput
                v-model="state.name"
                placeholder="Nome del torneo"
                icon="i-lucide-trophy"
              />
            </UFormField>

            <UFormField label="Formato" name="format">
              <USelectMenu
                v-model="state.format"
                :items="formatOptions"
                placeholder="Seleziona formato"
                icon="i-lucide-layers"
              />
            </UFormField>
          </div>

          <h3 class="text-lg font-semibold text-primary">
            Pianificazione dell'evento
          </h3>

          <div class="grid grid-cols-4 gap-4">
            <UFormField label="Data di inizio" name="start_date">
              <UInput
                v-model="state.start_date"
                type="date"
                icon="i-lucide-calendar"
              />
            </UFormField>

            <UFormField label="Ora di inizio" name="start_time">
              <UInput
                v-model="state.start_time"
                type="time"
                icon="i-lucide-clock"
                placeholder="HH:MM"
              />
            </UFormField>

            <UFormField label="Numero di round" name="round_count">
              <UInputNumber
                v-model="state.round_count"
                :min="1"
                icon="i-lucide-hash"
              />
            </UFormField>

            <UFormField label="Durata round (min)" name="round_duration">
              <UInputNumber
                v-model="state.round_duration"
                :step="5"
                icon="i-lucide-timer"
              />
            </UFormField>
          </div>
        </div>

        <!-- Dati dell'organizzatore -->
        <div class="space-y-4">
          <h3 class="text-lg font-semibold text-primary">
            Dati dell'organizzatore
          </h3>

          <div class="grid grid-cols-2 gap-4">
            <UFormField label="Organizzatore" name="organizer">
              <USelectMenu
                v-model="state.organizer"
                :items="organizerOptions"
                placeholder="Seleziona organizzatore"
                icon="i-lucide-user"
              />
            </UFormField>

            <UFormField label="Lega" name="league">
              <USelectMenu
                v-model="state.league"
                :items="leagueOptions"
                placeholder="Seleziona lega"
                icon="i-lucide-flag"
              />
            </UFormField>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <UFormField label="Luogo" name="location">
              <UInput
                v-model="state.location"
                placeholder="Luogo dell'evento"
                icon="i-lucide-map-pin"
              />
            </UFormField>

            <UFormField label="Costo iscrizione (€)" name="entry_fee">
              <UInputNumber
                v-model="state.entry_fee"
                :min="0"
                :step="5"
                icon="i-lucide-euro"
              />
            </UFormField>
          </div>
        </div>

        <!-- Dati aggiuntivi -->
        <div class="space-y-4">
          <h3 class="text-lg font-semibold text-primary">
            Dati aggiuntivi
          </h3>

          <div class="grid grid-cols-2 gap-4">
            <UFormField label="Regolamento" name="ruleset" required>
              <USelectMenu
                v-model="state.ruleset"
                :items="rulesetOptions"
                placeholder="Seleziona regolamento"
                icon="i-lucide-book-open"
              />
            </UFormField>

            <UFormField label="Codice Companion" name="companion_code">
              <UInput
                v-model="state.companion_code"
                placeholder="Codice MTG Companion"
                icon="i-lucide-smartphone"
                maxlength="7"
                pattern="[A-Z0-9]{0,7}"
              />
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
