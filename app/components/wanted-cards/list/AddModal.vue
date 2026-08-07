<!-- app\components\wanted-cards\list\AddModal.vue -->
<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'

const open = defineModel<boolean>({ default: false })
const toast = useToast()
const { t } = useI18n()

// Nomi presi dai mock associati — in futuro andrà collegato agli associati reali.
const playerOptions = [
  'Emanuele Nardi',
  'Roberto Gelmini',
  'Francesco Guzzonato'
]

// Lingue di stampa fisica tuttora attive per Magic (dal 2024: solo queste
// sei, dopo la dismissione di russo/coreano/cinese tradizionale nel 2022 e
// di portoghese/cinese semplificato nel 2024). Bandiere dal set circle-flags,
// stesso pattern del selettore lingua di korallo.pizza.
const languageOptions = computed(() => [
  { label: t('wantedCard.languages.any'), value: 'any', icon: 'i-lucide-languages' },
  { label: t('wantedCard.languages.en'), value: 'en', icon: 'i-circle-flags-gb' },
  { label: t('wantedCard.languages.it'), value: 'it', icon: 'i-circle-flags-it' },
  { label: t('wantedCard.languages.es'), value: 'es', icon: 'i-circle-flags-es' },
  { label: t('wantedCard.languages.fr'), value: 'fr', icon: 'i-circle-flags-fr' },
  { label: t('wantedCard.languages.de'), value: 'de', icon: 'i-circle-flags-de' },
  { label: t('wantedCard.languages.ja'), value: 'ja', icon: 'i-circle-flags-jp' }
])

// Chip toggle, stesso pattern usato per i formati nella modale "Crea Nuovo
// Giocatore" di league (UButton solid/outline invece di un select).
const treatmentOptions = computed(() => [
  { label: t('wantedCard.treatments.foil'), value: 'foil' },
  { label: t('wantedCard.treatments.fullArt'), value: 'fullArt' },
  { label: t('wantedCard.treatments.alternateArt'), value: 'alternateArt' },
  { label: t('wantedCard.treatments.extendedArt'), value: 'extendedArt' },
  { label: t('wantedCard.treatments.borderless'), value: 'borderless' },
  { label: t('wantedCard.treatments.showcase'), value: 'showcase' },
  { label: t('wantedCard.treatments.retroFrame'), value: 'retroFrame' }
])

const schema = z.object({
  // TODO: sostituire con un campo di ricerca live su Scryfall (autocomplete
  // + immagine/URL risolti automaticamente) invece di testo libero.
  name: z.string().min(2, t('wantedCard.addModal.validation.nameTooShort')),
  copies: z.number().int().positive(),
  language: z.string(),
  treatment: z.array(z.string()).optional(),
  notes: z.string().optional(),
  player: z.string()
})

type Schema = z.output<typeof schema>

const state = reactive<Partial<Schema>>({
  name: undefined,
  copies: 1,
  language: 'any',
  treatment: [],
  notes: undefined,
  player: undefined
})

const currentLanguage = computed(() => languageOptions.value.find(l => l.value === state.language))

function toggleTreatment(value: string) {
  const current = state.treatment ?? []
  state.treatment = current.includes(value)
    ? current.filter(v => v !== value)
    : [...current, value]
}

async function onSubmit(event: FormSubmitEvent<Schema>) {
  toast.add({
    title: t('wantedCard.addModal.successToastTitle'),
    description: t('wantedCard.addModal.successToastDescription', { name: event.data.name }),
    color: 'success'
  })
  open.value = false
}
</script>

<template>
  <UModal
    v-model:open="open"
    :title="$t('wantedCard.addModal.title')"
    :description="$t('wantedCard.addModal.description')"
  >
    <UButton :label="$t('wantedCard.openButton')" icon="i-lucide-plus" @click="open = true" />

    <template #body>
      <UForm
        :schema="schema"
        :state="state"
        class="space-y-4"
        @submit="onSubmit"
      >
        <UFormField :label="$t('wantedCard.addModal.fields.name')" name="name" required>
          <UInput
            v-model="state.name"
            :placeholder="$t('wantedCard.addModal.fields.namePlaceholder')"
            icon="i-lucide-scan-search"
            class="w-full"
          />
        </UFormField>

        <div class="grid grid-cols-2 gap-2">
          <UFormField :label="$t('wantedCard.addModal.fields.copies')" name="copies">
            <UInputNumber v-model="state.copies" :min="1" class="w-full" />
          </UFormField>

          <UFormField :label="$t('wantedCard.addModal.fields.language')" name="language">
            <USelectMenu
              v-model="state.language"
              :items="languageOptions"
              value-key="value"
              :search-input="false"
              :icon="currentLanguage?.icon"
              class="w-full"
            />
          </UFormField>
        </div>

        <UFormField :label="$t('wantedCard.addModal.fields.treatment')" name="treatment">
          <div class="flex flex-wrap gap-2">
            <UButton
              v-for="option in treatmentOptions"
              :key="option.value"
              type="button"
              size="sm"
              :variant="state.treatment?.includes(option.value) ? 'solid' : 'outline'"
              :color="state.treatment?.includes(option.value) ? 'primary' : 'neutral'"
              @click="toggleTreatment(option.value)"
            >
              {{ option.label }}
            </UButton>
          </div>
        </UFormField>

        <UFormField :label="$t('wantedCard.addModal.fields.player')" name="player" required>
          <USelectMenu
            v-model="state.player"
            :items="playerOptions"
            :placeholder="$t('wantedCard.addModal.fields.selectPlayer')"
            class="w-full"
          />
        </UFormField>

        <UFormField :label="$t('wantedCard.addModal.fields.notes')" name="notes">
          <UTextarea
            v-model="state.notes"
            :placeholder="$t('wantedCard.addModal.fields.notesPlaceholder')"
            class="w-full"
          />
        </UFormField>

        <div class="flex justify-end gap-2">
          <UButton
            :label="$t('wantedCard.addModal.cancel')"
            color="neutral"
            variant="subtle"
            @click="open = false"
          />
          <UButton
            :label="$t('wantedCard.addModal.create')"
            color="primary"
            variant="solid"
            type="submit"
          />
        </div>
      </UForm>
    </template>
  </UModal>
</template>
