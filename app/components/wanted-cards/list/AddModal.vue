<!-- app\components\wanted-cards\list\AddModal.vue -->
<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'

const open = defineModel<boolean>({ default: false })
const toast = useToast()
const { t } = useI18n()

// NOTE: stiamo cercando fra gli Associati (pauperwave_associates), non fra i
// Giocatori (sezione/tabella separata in sidebar) — sono gli unici per cui
// esiste oggi un uuid da collegare a player_associate_uuid. Se in futuro le
// richieste dovessero riferirsi a un Giocatore che non è (ancora) un
// associato, questo picker andrà ripensato.
const { associates } = useAssociates()
const { createWantedCard } = useWantedCardsMutations()

// "APS Pauperwave" (PW-0000) è il record anagrafico dell'associazione stessa,
// non un giocatore reale — non ha senso comparire come richiedente.
const APS_PAUPERWAVE_UUID = '8578797c-62b0-4e48-a237-3b65683a2623'

const playerOptions = computed(() => associates.value
  .filter(associate => associate.uuid !== APS_PAUPERWAVE_UUID)
  .map(associate => ({
    label: `${associate.first_name} ${associate.last_name}`,
    value: associate.uuid
  })))

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

const schema = z.object({
  name: z.string().min(2, t('wantedCard.addModal.validation.nameTooShort')),
  printingId: z.string().min(1, t('wantedCard.addModal.validation.printingRequired')),
  copies: z.number().int().positive(),
  language: z.string(),
  foil: z.boolean().optional(),
  notes: z.string().optional(),
  player: z.string().min(1, t('wantedCard.addModal.validation.playerRequired'))
})

type Schema = z.output<typeof schema>

const state = reactive<Partial<Schema>>({
  name: undefined,
  printingId: undefined,
  copies: 1,
  language: 'any',
  foil: false,
  notes: undefined,
  player: undefined
})

const currentLanguage = computed(() => languageOptions.value.find(l => l.value === state.language))

// Ricerca live su Scryfall — vedi commento in useScryfallCardSearch.ts sul
// perché non un catalogo locale come i comandanti in league.
const { query, nameSuggestions, isSuggesting, printings, isLoadingPrintings, fetchPrintings } = useScryfallCardSearch()

// Una carta scelta dall'autocomplete ha (quasi) sempre più stampe: appena il
// nome è confermato si sceglie anche l'edizione/artwork esatta, azzerando la
// selezione precedente (un nome diverso invalida la stampa già scelta).
watch(() => state.name, (name) => {
  state.printingId = undefined
  if (name) fetchPrintings(name)
  else printings.value = []
})

// "Trattamento" (full art, extended art, borderless, ecc.) è sparito: sono
// tutte proprietà della stampa specifica, già scelta col selettore
// "Edizione" — un menu separato sarebbe ridondante. "Foil" resta, perché è
// una finitura indipendente dalla stampa (la stessa stampa esiste spesso sia
// foil che non-foil) — disponibile solo se la stampa scelta la supporta.
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

const selectedPrinting = computed(() => printings.value.find(printing => printing.id === state.printingId))

const submitting = ref(false)

// `state` è un oggetto reactive persistente sull'istanza del componente —
// UModal si limita a nascondere/mostrare, non smonta/rimonta il form —
// quindi va svuotato esplicitamente dopo un submit riuscito, altrimenti la
// prossima apertura riparte dall'ultima richiesta inserita.
function resetForm() {
  state.name = undefined
  state.printingId = undefined
  state.copies = 1
  state.language = 'any'
  state.foil = false
  state.notes = undefined
  state.player = undefined
  query.value = ''
  printings.value = []
}

async function onSubmit(event: FormSubmitEvent<Schema>) {
  const printing = printings.value.find(p => p.id === event.data.printingId)
  if (!printing) return

  submitting.value = true
  try {
    await createWantedCard.mutateAsync({
      playerAssociateUuid: event.data.player,
      cardName: printing.name,
      scryfallUrl: printing.scryfallUrl,
      manaCost: printing.manaCost,
      colorIdentity: printing.colorIdentity,
      cmc: printing.cmc,
      imageUrl: printing.imageUrl,
      copies: event.data.copies,
      language: event.data.language === 'any' ? null : event.data.language,
      treatment: event.data.foil ? ['foil'] : [],
      notes: event.data.notes || null
    })

    toast.add({
      title: t('wantedCard.addModal.successToastTitle'),
      description: t('wantedCard.addModal.successToastDescription', { name: printing.name }),
      color: 'success'
    })
    open.value = false
    resetForm()
  } catch (err) {
    toast.add({
      title: t('wantedCard.addModal.errorToastTitle'),
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
    :title="$t('wantedCard.addModal.title')"
    :description="$t('wantedCard.addModal.description')"
    :ui="{ content: 'max-w-xl' }"
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
          <USelectMenu
            v-model="state.name"
            v-model:search-term="query"
            :items="nameSuggestions"
            :loading="isSuggesting"
            ignore-filter
            :placeholder="$t('wantedCard.addModal.fields.namePlaceholder')"
            icon="i-lucide-scan-search"
            class="w-full"
          />
        </UFormField>

        <UFormField :label="$t('wantedCard.addModal.fields.printing')" name="printingId" required>
          <USelectMenu
            v-model="state.printingId"
            :items="printingItems"
            value-key="value"
            :disabled="!state.name"
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

        <WantedCardsCardPreview :printing="selectedPrinting ?? null" />

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
            :description="selectedPrinting && !selectedPrinting.finishes.includes('foil') ? $t('wantedCard.addModal.foilUnavailable') : undefined"
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
            @click="open = false; resetForm()"
          />
          <UButton
            :label="$t('wantedCard.addModal.create')"
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
