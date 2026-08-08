<!-- app\components\wanted-cards\list\EditModal.vue -->

<!--
  A differenza di AddModal.vue non permette di cambiare carta/edizione:
  modificare quelle equivarrebbe a creare una richiesta diversa, non a
  correggere quella esistente. Qui si modificano solo copie, lingua, foil,
  note e giocatore — nome/edizione/immagine restano di sola lettura.
-->
<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import type { WantedCard } from '~/types'

const open = defineModel<boolean>({ default: false })
const { card } = defineProps<{
  card: WantedCard | null
}>()

const toast = useToast()
const { t } = useI18n()

const { associates } = useAssociates()
const { updateWantedCard } = useWantedCardsMutations()

// Stessa esclusione di AddModal.vue: "APS Pauperwave" è il record
// dell'associazione stessa, non un giocatore reale.
const APS_PAUPERWAVE_UUID = '8578797c-62b0-4e48-a237-3b65683a2623'

const playerOptions = computed(() => associates.value
  .filter(associate => associate.uuid !== APS_PAUPERWAVE_UUID)
  .map(associate => ({
    label: `${associate.first_name} ${associate.last_name}`,
    value: associate.uuid
  })))

const languageOptions = computed(() => [
  { label: t('wantedCard.languages.any'), value: 'any', icon: 'i-lucide-languages' },
  { label: t('wantedCard.languages.en'), value: 'en', icon: 'i-circle-flags-gb' },
  { label: t('wantedCard.languages.it'), value: 'it', icon: 'i-circle-flags-it' },
  { label: t('wantedCard.languages.es'), value: 'es', icon: 'i-circle-flags-es' },
  { label: t('wantedCard.languages.fr'), value: 'fr', icon: 'i-circle-flags-fr' },
  { label: t('wantedCard.languages.de'), value: 'de', icon: 'i-circle-flags-de' },
  { label: t('wantedCard.languages.ja'), value: 'ja', icon: 'i-circle-flags-jp' }
])

const schema = z.object({
  copies: z.number().int().positive(),
  language: z.string(),
  foil: z.boolean().optional(),
  notes: z.string().optional(),
  player: z.string().min(1, t('wantedCard.addModal.validation.playerRequired'))
})

type Schema = z.output<typeof schema>

const state = reactive<Partial<Schema>>({})

// Rialimenta lo stato del form ogni volta che si apre la modale su una carta
// diversa — a differenza di AddModal.vue non c'è un submit riuscito che la
// svuota (qui si riapre sempre su un record esistente).
watch([open, () => card], ([isOpen, currentCard]) => {
  if (!isOpen || !currentCard) return
  state.copies = currentCard.copies
  state.language = currentCard.language || 'any'
  state.foil = currentCard.treatment.includes('foil')
  state.notes = currentCard.notes || undefined
  state.player = currentCard.playerAssociateUuid
}, { immediate: true })

const currentLanguage = computed(() => languageOptions.value.find(l => l.value === state.language))

const submitting = ref(false)

async function onSubmit(event: FormSubmitEvent<Schema>) {
  if (!card) return

  submitting.value = true
  try {
    await updateWantedCard.mutateAsync({
      id: card.id,
      edits: {
        playerAssociateUuid: event.data.player,
        copies: event.data.copies,
        language: event.data.language === 'any' ? null : event.data.language,
        treatment: event.data.foil ? ['foil'] : [],
        notes: event.data.notes || null
      }
    })

    toast.add({
      title: t('wantedCard.editModal.successToastTitle'),
      description: t('wantedCard.editModal.successToastDescription', { name: card.cardName }),
      color: 'success'
    })
    open.value = false
  } catch (err) {
    toast.add({
      title: t('wantedCard.editModal.errorToastTitle'),
      description: toErrorMessage(err),
      color: 'error'
    })
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <UModal
    v-model:open="open"
    :title="$t('wantedCard.editModal.title')"
    :description="card ? card.cardName : ''"
    :ui="{ content: 'max-w-xl' }"
  >
    <template #body>
      <UForm
        v-if="card"
        :schema="schema"
        :state="state"
        class="space-y-4"
        @submit="onSubmit"
      >
        <div class="flex items-center gap-4">
          <img
            v-if="card.imageUrl"
            :src="card.imageUrl"
            :alt="card.cardName"
            class="w-24 rounded-lg shadow"
          >
          <div class="min-w-0">
            <p class="font-semibold truncate">
              {{ card.cardName }}
            </p>
            <p class="text-sm text-muted">
              {{ $t('wantedCard.editModal.cardReadOnlyHint') }}
            </p>
          </div>
        </div>

        <div class="grid grid-cols-3 gap-2">
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

          <UFormField :label="$t('wantedCard.treatments.foil')" name="foil">
            <USwitch v-model="state.foil" />
          </UFormField>
        </div>

        <UFormField :label="$t('wantedCard.addModal.fields.player')" name="player" required>
          <USelectMenu
            v-model="state.player"
            :items="playerOptions"
            value-key="value"
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
            :disabled="submitting"
            @click="open = false"
          />
          <UButton
            :label="$t('wantedCard.editModal.save')"
            color="primary"
            variant="solid"
            type="submit"
            :loading="submitting"
          />
        </div>
      </UForm>
    </template>
  </UModal>
</template>
