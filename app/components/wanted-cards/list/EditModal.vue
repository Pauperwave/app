<!-- app\components\wanted-cards\list\EditModal.vue -->

<!--
  A differenza di AddModal.vue non permette di cambiare il nome della carta
  (equivarrebbe a creare una richiesta diversa) — l'edizione/stampa esatta è
  invece modificabile con lo stesso picker Scryfall di AddModal.vue.
-->
<script setup lang="ts">
import * as v from 'valibot'
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

// Stesso pattern di ricerca stampe di AddModal.vue, ma il nome è fisso (non
// cercabile) — fetchPrintings parte direttamente sul nome della carta
// esistente appena la modale si apre.
const { printings, isLoadingPrintings, fetchPrintings } = useScryfallCardSearch()

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

// Stessi messaggi custom di AddModal.vue (vedi commento lì sul perché
// v.pipe(v.string(msg), v.minLength(...)) copre sia il campo mai valorizzato
// sia la stringa vuota).
const schema = v.object({
  printingId: v.pipe(
    v.string(t('wantedCard.addModal.validation.printingRequired')),
    v.minLength(1, t('wantedCard.addModal.validation.printingRequired'))
  ),
  copies: v.pipe(
    v.number(t('wantedCard.addModal.validation.copiesRequired')),
    v.integer(t('wantedCard.addModal.validation.copiesInteger')),
    v.minValue(1, t('wantedCard.addModal.validation.copiesPositive'))
  ),
  language: v.string(),
  foil: v.optional(v.boolean()),
  notes: v.optional(v.string()),
  player: v.pipe(
    v.string(t('wantedCard.addModal.validation.playerRequired')),
    v.minLength(1, t('wantedCard.addModal.validation.playerRequired'))
  )
})

type Schema = v.InferOutput<typeof schema>

const state = reactive<Partial<Schema>>({})

// Rialimenta lo stato del form ogni volta che si apre la modale su una carta
// diversa — a differenza di AddModal.vue non c'è un submit riuscito che la
// svuota (qui si riapre sempre su un record esistente). Le stampe si
// ricaricano sul nome fisso della carta, poi si preseleziona quella già
// salvata confrontando lo scryfallUrl.
watch([open, () => card], async ([isOpen, currentCard]) => {
  if (!isOpen || !currentCard) return
  state.copies = currentCard.copies
  state.language = currentCard.language || 'any'
  state.foil = currentCard.treatment.includes('foil')
  state.notes = currentCard.notes || undefined
  state.player = currentCard.playerAssociateUuid

  await fetchPrintings(currentCard.cardName)
  // Confronto solo sulla parte base dell'URL (senza query string): l'API
  // Scryfall aggiunge sempre parametri di tracking (?utm_source=...) allo
  // scryfall_uri restituito ora, mentre alcune richieste più vecchie (dati
  // migrati dal mock iniziale) hanno un scryfallUrl "pulito" salvato senza —
  // un confronto esatto tra le due stringhe non troverebbe mai match.
  const currentBaseUrl = currentCard.scryfallUrl.split('?')[0]
  state.printingId = printings.value.find(p => p.scryfallUrl.split('?')[0] === currentBaseUrl)?.id
}, { immediate: true })

const currentLanguage = computed(() => languageOptions.value.find(l => l.value === state.language))

// Stesso motivo di AddModal.vue: "Foil" è una finitura indipendente dalla
// stampa, disponibile solo se la stampa scelta la supporta.
watch(() => state.printingId, (printingId) => {
  const printing = printings.value.find(p => p.id === printingId)
  if (!printing?.finishes.includes('foil')) state.foil = false
})

const printingItems = computed(() => printings.value.map(printing => ({
  label: printing.setName,
  collectorNumber: printing.collectorNumber,
  imageUrl: printing.imageUrl,
  price: printing.price,
  value: printing.id
})))

const selectedPrinting = computed(() =>
  printings.value.find(printing => printing.id === state.printingId))

const foilUnavailableHint = computed(() =>
  selectedPrinting.value && !selectedPrinting.value.finishes.includes('foil')
    ? t('wantedCard.addModal.foilUnavailable')
    : undefined)

const submitting = ref(false)

async function onSubmit(event: FormSubmitEvent<Schema>) {
  if (!card) return

  const printing = printings.value.find(p => p.id === event.data.printingId)
  if (!printing) return

  submitting.value = true
  try {
    await updateWantedCard.mutateAsync({
      id: card.id,
      edits: {
        playerAssociateUuid: event.data.player,
        scryfallUrl: printing.scryfallUrl,
        scryfallId: printing.id,
        setCode: printing.set,
        manaCost: printing.manaCost,
        colorIdentity: printing.colorIdentity,
        cmc: printing.cmc,
        imageUrl: printing.imageUrl,
        cardmarketPrice: printing.price,
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
        <div>
          <p class="font-semibold truncate">
            {{ card.cardName }}
          </p>
          <p class="text-sm text-muted">
            {{ $t('wantedCard.editModal.cardReadOnlyHint') }}
          </p>
        </div>

        <UFormField :label="$t('wantedCard.addModal.fields.printing')" name="printingId" required>
          <USelectMenu
            v-model="state.printingId"
            :items="printingItems"
            value-key="value"
            :filter-fields="['label', 'collectorNumber']"
            :loading="isLoadingPrintings"
            :placeholder="$t('wantedCard.addModal.fields.printingPlaceholder')"
            class="w-full"
          >
            <template #item-label="{ item }">
              <WantedCardsListPrintingRow
                :label="item.label"
                :collector-number="item.collectorNumber"
                :image-url="item.imageUrl"
                :price="item.price"
              />
            </template>
          </USelectMenu>
        </UFormField>

        <MagicCardPreview :printing="selectedPrinting ?? null" />

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

          <UFormField
            :label="$t('wantedCard.treatments.foil')"
            name="foil"
            :description="foilUnavailableHint"
          >
            <USwitch
              v-model="state.foil"
              :disabled="!selectedPrinting?.finishes.includes('foil')"
            />
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
