<!-- app\components\wanted-cards\list\AddModal.vue -->
<script setup lang="ts">
import * as v from 'valibot'
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
const currentAssociate = useCurrentAssociate()

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

// v.string(msg)/v.number(msg) personalizzano anche l'errore di TIPO (non solo
// i vincoli come minLength/minValue) — prima, con Zod, un campo mai
// selezionato (undefined) falliva il controllo di tipo prima ancora di
// arrivare a .min(), mostrando il messaggio generico di libreria ("Invalid
// input: expected string, received undefined") invece del nostro
// (osservato su "Edizione" in produzione, 2026-08-08). Ogni v.pipe() qui
// copre entrambi i casi con lo stesso messaggio, dove il campo è
// obbligatorio.
const schema = v.object({
  name: v.pipe(
    v.string(t('wantedCard.addModal.validation.nameRequired')),
    v.minLength(2, t('wantedCard.addModal.validation.nameTooShort'))
  ),
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

// Precompila "Giocatore" con l'utente loggato appena la modale si apre — non
// al setup del componente, perché associates/authUser potrebbero non essere
// ancora risolti in quel momento. Non sovrascrive una scelta già fatta a
// mano (!state.player), quindi riaprire la modale dopo averla cambiata non
// la resetta all'utente loggato.
watch([open, currentAssociate], ([isOpen, associate]) => {
  if (isOpen && associate && !state.player) state.player = associate.uuid
})

// Ricerca live su Scryfall — vedi commento in useScryfallCardSearch.ts sul
// perché non un catalogo locale come i comandanti in league.
const {
  query, nameSuggestions, isSuggesting, printings, isLoadingPrintings, fetchPrintings
} = useScryfallCardSearch()

// value-key sul nome: così state.name resta una stringa anche se gli item
// portano con sé il costo di mana da mostrare nella riga (stesso schema di
// printingItems qui sotto).
const nameItems = computed(() => nameSuggestions.value.map(suggestion => ({
  label: suggestion.name,
  manaCost: suggestion.manaCost,
  imageUrl: suggestion.imageUrl,
  value: suggestion.name
})))

// Una carta scelta dall'autocomplete ha (quasi) sempre più stampe: appena il
// nome è confermato si sceglie anche l'edizione/artwork esatta, azzerando la
// selezione precedente (un nome diverso invalida la stampa già scelta).
watch(() => state.name, (name) => {
  state.printingId = undefined
  fetchPrintings(name)
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

// Prezzo CardTrader per ogni stampa candidata nel picker "Edizione" — a
// differenza di cardmarketPrice (già nella risposta di Scryfall), va
// richiesto separatamente per ognuna: anteprima best-effort (nessun filtro
// lingua/foil, vedi commento in server/api/cardtrader/price.get.ts), il
// prezzo preciso arriva dopo il salvataggio via refresh-prices. undefined =
// non ancora richiesto, null = richiesto ma nessuna inserzione trovata —
// cache locale per stampa, non svuotata tra una ricerca e l'altra: riaprire
// lo stesso nome in questa sessione della modale non ripete le chiamate.
const cardtraderPrices = ref<Record<string, number | null>>({})
watch(printings, (list) => {
  for (const printing of list) {
    if (printing.id in cardtraderPrices.value) continue
    $fetch<{ price: number | null }>('/api/cardtrader/price', {
      query: { scryfallId: printing.id, setCode: printing.set }
    })
      .then(({ price }) => { cardtraderPrices.value[printing.id] = price })
      .catch(() => { cardtraderPrices.value[printing.id] = null })
  }
})

const printingItems = computed(() => printings.value.map(printing => ({
  label: printing.setName,
  collectorNumber: printing.collectorNumber,
  imageUrl: printing.imageUrl,
  cardmarketPrice: printing.price,
  cardtraderPrice: cardtraderPrices.value[printing.id] ?? null,
  value: printing.id
})))

const selectedPrinting = computed(() =>
  printings.value.find(printing => printing.id === state.printingId))

const foilUnavailableHint = computed(() =>
  selectedPrinting.value && !selectedPrinting.value.finishes.includes('foil')
    ? t('wantedCard.addModal.foilUnavailable')
    : undefined)

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
    <UButton
      id="tour-wanted-cards-add"
      :label="$t('wantedCard.openButton')"
      icon="i-lucide-plus"
      @click="open = true"
    />

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
            :items="nameItems"
            value-key="value"
            :loading="isSuggesting"
            ignore-filter
            :placeholder="$t('wantedCard.addModal.fields.namePlaceholder')"
            icon="i-lucide-scan-search"
            class="w-full"
          >
            <template #item-label="{ item }">
              <MagicCardHoverPreview
                :image-url="item.imageUrl"
                :alt="item.label"
                class="flex items-center gap-2 min-w-0"
              >
                <!-- Sfondo scuro dietro i simboli, come in league: quelli
                     bianchi/incolori sparirebbero sul tema chiaro. -->
                <span v-if="item.manaCost" class="shrink-0 bg-gray-950 p-1 rounded">
                  <MagicManaCost :mana-cost="item.manaCost" size="sm" />
                </span>
                <span class="truncate">{{ item.label }}</span>
              </MagicCardHoverPreview>
            </template>
          </USelectMenu>
        </UFormField>

        <UFormField :label="$t('wantedCard.addModal.fields.printing')" name="printingId" required>
          <USelectMenu
            v-model="state.printingId"
            :items="printingItems"
            value-key="value"
            :filter-fields="['label', 'collectorNumber']"
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
                :cardmarket-price="item.cardmarketPrice"
                :cardtrader-price="item.cardtraderPrice"
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
