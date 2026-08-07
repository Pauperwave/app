<!-- app\pages\(community)\wanted-cards\index.vue -->
<script lang="ts" setup>
import { h, resolveComponent } from 'vue'
import { getFacetedRowModel, getFacetedUniqueValues, getGroupedRowModel } from '@tanstack/vue-table'
import type { Column } from '@tanstack/vue-table'
import type { TableColumn } from '@nuxt/ui'
import ManaCost from '~/components/wanted-cards/ManaCost.vue'
import CardPreviewTooltip from '~/components/wanted-cards/CardPreviewTooltip.vue'
import PlayerTag from '~/components/wanted-cards/PlayerTag.vue'

const { t } = useI18n()

const UBadge = resolveComponent('UBadge')
const UIcon = resolveComponent('UIcon')
const UButton = resolveComponent('UButton')

// Header ordinabile — pattern verbatim dalla doc Nuxt UI per UTable (icona
// che riflette lo stato corrente, toggle asc/desc al click).
function sortableHeader(label: string, column: Column<WantedCard, unknown>) {
  const isSorted = column.getIsSorted()
  return h(UButton, {
    label,
    color: 'neutral',
    variant: 'ghost',
    class: '-mx-2.5',
    icon: isSorted
      ? (isSorted === 'asc' ? 'i-lucide-arrow-up-narrow-wide' : 'i-lucide-arrow-down-wide-narrow')
      : 'i-lucide-arrow-up-down',
    onClick: () => column.toggleSorting(isSorted === 'asc')
  })
}

// Raggruppamento per giocatore on demand (non attivo di default) — un
// giocatore come "Francesco Guzzonato" con 15 richieste può diventare una
// sola riga espandibile invece di 15 righe ripetute con lo stesso nome,
// ma solo se l'utente lo richiede esplicitamente tramite il toggle.
const grouping = ref<string[]>([])
const sorting = ref([{ id: 'player', desc: true }])

interface TableColumnRef {
  id: string
  getFilterValue: () => unknown
  getFacetedUniqueValues: () => Map<unknown, number>
  getCanHide: () => boolean
  getIsVisible: () => boolean
  toggleVisibility: (value: boolean) => void
}

interface TableRef {
  tableApi: {
    getColumn: (id: string) => TableColumnRef | undefined
    getAllColumns: () => TableColumnRef[]
  }
}

const table = useTemplateRef<TableRef>('table')
const columnVisibility = ref({})

// Etichette leggibili per il menu "Colonne" — stessa mappa i18n usata per
// gli header effettivi delle colonne (pattern da associates/index.vue).
const columnHeaders: Record<string, string> = {
  player: t('wantedCard.columns.player'),
  cmc: t('wantedCard.columns.manaCost'),
  cardName: t('wantedCard.columns.name'),
  price: t('wantedCard.columns.price'),
  copies: t('wantedCard.columns.copies'),
  language: t('wantedCard.columns.language'),
  treatment: t('wantedCard.columns.treatment'),
  date: t('wantedCard.columns.date'),
  found: t('wantedCard.columns.found'),
  notes: t('wantedCard.columns.notes')
}

// Rigenerato ogni volta che si apre il menu (via :items) — pattern ufficiale
// Nuxt UI (doc UTable, sezione "Column visibility"): getAllColumns() +
// getCanHide() + toggleVisibility(), non v-model diretto sui singoli item.
const columnVisibilityItems = computed(() => {
  void columnVisibility.value
  return (table.value?.tableApi?.getAllColumns() ?? [])
    .filter(column => column.getCanHide())
    .map(column => ({
      label: columnHeaders[column.id] ?? column.id,
      type: 'checkbox' as const,
      checked: column.getIsVisible(),
      onUpdateChecked(checked: boolean) {
        table.value?.tableApi?.getColumn(column.id)?.toggleVisibility(checked)
      },
      onSelect(e: Event) {
        e.preventDefault()
      }
    }))
})

// Menu "Visualizza" unico: raggruppamento + colonne visibili sono entrambe
// preferenze di rendering della tabella, non filtri sui dati — consolidati
// in un solo dropdown invece di due controlli separati in riga 2.
const viewItems = computed(() => [
  {
    label: t('wantedCard.filters.groupByPlayer'),
    type: 'checkbox' as const,
    checked: grouping.value.length > 0,
    onUpdateChecked(checked: boolean) {
      grouping.value = checked ? ['player'] : []
    },
    onSelect(e: Event) {
      e.preventDefault()
    }
  },
  { type: 'separator' as const },
  ...columnVisibilityItems.value
])

const cardNameFilter = ref('')
// "In cerca" di default — le carte già trovate restano nascoste finché non
// si sceglie esplicitamente la tab "Trovate" o "Tutte".
const statusFilter = ref<'all' | 'found' | 'searching'>('searching')
// Singola selezione (non più multipla): permette di mostrare l'icona della
// lingua scelta nel trigger tramite la prop `:icon`, cosa che con
// USelectMenu/UInputMenu `multiple` non ha un pattern ufficiale pulito.
const languageFilter = ref<string | undefined>(undefined)
const treatmentFilter = ref<string[]>([])

// Costruito come un unico array dichiarativo, esattamente come l'esempio
// ufficiale Nuxt UI (`ref([{ id: 'email', value: 'james' }])`) — invece di
// mutare lo stato dei filtri con più chiamate imperative a
// column.setFilterValue(), che con questa combinazione di grouping e
// faceted-options non persistevano in modo affidabile.
const columnFilters = computed<{ id: string, value: unknown }[]>(() => {
  const filters: { id: string, value: unknown }[] = []
  if (cardNameFilter.value) filters.push({ id: 'cardName', value: cardNameFilter.value })
  if (statusFilter.value !== 'all') filters.push({ id: 'found', value: statusFilter.value === 'found' })
  if (languageFilter.value !== undefined) {
    filters.push({ id: 'language', value: languageFilter.value === 'any' ? '' : languageFilter.value })
  }
  if (treatmentFilter.value.length) filters.push({ id: 'treatment', value: treatmentFilter.value })
  return filters
})

const statusTabs = computed<{ label: string, value: 'all' | 'found' | 'searching' }[]>(() => [
  { label: t('wantedCard.filters.statusAll'), value: 'all' },
  { label: t('wantedCard.foundYes'), value: 'found' },
  { label: t('wantedCard.foundNo'), value: 'searching' }
])

// Codici distinti presenti in una colonna faceted, ordinati — base comune
// per costruire gli item dei filtri Lingua/Trattamento a partire dai dati
// effettivamente visibili con la combinazione di filtri corrente.
function getFacetedCodes(columnId: string): string[] {
  void columnFilters.value
  const counts = table.value?.tableApi?.getColumn(columnId)?.getFacetedUniqueValues() as Map<string, number> | undefined
  return counts ? Array.from(counts.keys()).sort() : []
}

const languageFacetItems = computed<{ label: string, value: string, icon: string }[]>(() => {
  return getFacetedCodes('language').map((code: string) => ({
    // ComboboxItem (Reka UI, sotto USelectMenu/UInputMenu) non accetta
    // value="" — è riservato per rappresentare "nessuna selezione"/
    // placeholder. Il codice lingua vuoto ("Indifferente") usa quindi il
    // sentinel 'any', tradotto di nuovo in '' in columnFilters prima di
    // filtrare le righe.
    label: t(`wantedCard.languages.${code || 'any'}`),
    value: code || 'any',
    icon: languageFlags[code] ?? 'i-lucide-languages'
  }))
})

const selectedLanguage = computed(() => languageFacetItems.value.find(item => item.value === languageFilter.value))

const treatmentFacetItems = computed<{ label: string, value: string }[]>(() => {
  return getFacetedCodes('treatment').map((code: string) => ({ label: t(`wantedCard.treatments.${code}`), value: code }))
})

interface WantedCard {
  id: number
  date: string
  found: boolean
  cardName: string
  scryfallUrl: string
  copies: number
  language: string
  treatment: string[]
  // Dati Scryfall inseriti a mano per ora (vedi ADR nel PROGRESS.md) — quando
  // le carte saranno in un database reale, questi campi saranno lazy loaded
  // invece di far parte del record statico.
  manaCost: string
  colorIdentity: string[]
  cmc: number
  imageUrl: string
  // Prezzo scaricato una tantum da Scryfall (EUR, fallback USD) — nessun
  // refresh automatico per ora; un futuro tasto "Aggiorna prezzi" potrà
  // rilanciare il fetch quando le carte saranno in un database reale.
  price: number | null
  notes: string
  player: string
}

// Dati reali dal foglio condiviso, senza le immagini (colonna sempre vuota
// nel foglio stesso) e senza il contatto del giocatore (già presente nella
// tabella associati — niente da duplicare qui). In futuro il nome carta
// risolverà automaticamente immagine e URL Scryfall tramite ricerca live
// (vedi AddModal), invece di essere inserito a mano.
const data = ref<WantedCard[]>([
  { id: 1, date: '', found: false, cardName: 'Appa, Steadfast Guardian', scryfallUrl: 'https://scryfall.com/card/tla/10/appa-steadfast-guardian', copies: 1, language: 'en', treatment: [], manaCost: '{2}{W}{W}', colorIdentity: ['W'], cmc: 4, imageUrl: 'https://cards.scryfall.io/large/front/8/2/829d91e9-4878-4e55-a262-ac0d55b65d4e.jpg?1783905005', price: 7.86, notes: 'Non foil preferibilmente in inglese', player: 'Emanuele Nardi' },
  { id: 2, date: '', found: false, cardName: 'Mistrise Village', scryfallUrl: 'https://scryfall.com/card/tdm/261/mistrise-village', copies: 1, language: '', treatment: [], manaCost: '', colorIdentity: ['U'], cmc: 0, imageUrl: 'https://cards.scryfall.io/large/front/d/4/d44bccbf-6fab-46e4-8ddb-6577e27ec6e8.jpg?1783907277', price: 7.36, notes: '', player: 'Roberto Gelmini' },
  { id: 3, date: '2026-07-26', found: false, cardName: 'Swamp', scryfallUrl: 'https://scryfall.com/card/neo/297/ja/swamp', copies: 28, language: '', treatment: ['fullArt'], manaCost: '', colorIdentity: ['B'], cmc: 0, imageUrl: 'https://cards.scryfall.io/large/front/c/5/c50b3d79-2361-4858-98b0-64d83c4f7f70.jpg?1783923807', price: 3.48, notes: 'Considero anche l\'altra full art di NEO', player: 'Francesco Guzzonato' },
  { id: 4, date: '2026-04-27', found: true, cardName: 'Voice of Victory', scryfallUrl: 'https://scryfall.com/card/tdm/33/voice-of-victory', copies: 1, language: '', treatment: [], manaCost: '{1}{W}', colorIdentity: ['W'], cmc: 2, imageUrl: 'https://cards.scryfall.io/large/front/e/c/ec3de5f4-bb55-4ab9-995f-f3e0dc22c1bb.jpg?1783907401', price: 20.67, notes: '', player: 'Gabriele A. Scagliarini' },
  { id: 5, date: '2026-04-27', found: true, cardName: 'Valgavoth\'s Lair', scryfallUrl: 'https://scryfall.com/card/dsk/271/valgavoths-lair', copies: 1, language: '', treatment: [], manaCost: '', colorIdentity: [], cmc: 0, imageUrl: 'https://cards.scryfall.io/large/front/6/5/65ff914e-3f3e-4b7a-b69d-73575b68fb8e.jpg?1783909425', price: 0.69, notes: '', player: 'Francesco Guzzonato' },
  { id: 6, date: '2026-04-27', found: true, cardName: 'Haywire Mite', scryfallUrl: 'https://scryfall.com/card/dsc/247/haywire-mite', copies: 1, language: '', treatment: [], manaCost: '{1}', colorIdentity: ['G'], cmc: 1, imageUrl: 'https://cards.scryfall.io/large/front/2/8/286f4d3a-6b38-404f-aaea-a1d3694f4fe6.jpg?1783909585', price: 0.96, notes: '', player: 'Francesco Guzzonato' },
  { id: 7, date: '2026-04-27', found: true, cardName: 'Gloomshrieker', scryfallUrl: 'https://scryfall.com/card/neo/219/gloomshrieker', copies: 1, language: '', treatment: [], manaCost: '{1}{B}{G}', colorIdentity: ['B', 'G'], cmc: 3, imageUrl: 'https://cards.scryfall.io/large/front/a/2/a2b50751-7f65-4321-86da-eef735bf8b67.jpg?1783923836', price: 0.13, notes: '', player: 'Francesco Guzzonato' },
  { id: 8, date: '2026-04-27', found: true, cardName: 'Birds of Paradise', scryfallUrl: 'https://scryfall.com/card/rvr/133/birds-of-paradise', copies: 1, language: '', treatment: [], manaCost: '{G}', colorIdentity: ['G'], cmc: 1, imageUrl: 'https://cards.scryfall.io/large/front/3/d/3d69a3e0-6a2e-475a-964e-0affed1c017d.jpg?1783913307', price: 13.63, notes: '', player: 'Francesco Guzzonato' },
  { id: 9, date: '2025-10-25', found: false, cardName: 'Culla di Gea', scryfallUrl: 'https://scryfall.com/card/usg/321/it/culla-di-gea-(gaeas-cradle)', copies: 1, language: 'it', treatment: [], manaCost: '', colorIdentity: ['G'], cmc: 0, imageUrl: 'https://cards.scryfall.io/large/front/2/5/25b0b816-0583-44aa-9dc5-f3ff48993a51.jpg?1783946299', price: 1254.22, notes: '', player: 'Omar A. Zanoni' },
  { id: 10, date: '2025-10-25', found: false, cardName: 'Lotus Petal', scryfallUrl: 'https://scryfall.com/card/tmp/294/lotus-petal', copies: 1, language: '', treatment: [], manaCost: '{0}', colorIdentity: [], cmc: 0, imageUrl: 'https://cards.scryfall.io/large/front/6/c/6c877da3-68fa-41d0-8a24-8c79fcd8ecc1.jpg?1783946602', price: 25.80, notes: '', player: 'Francesco Guzzonato' },
  { id: 11, date: '2025-10-25', found: false, cardName: 'The Wandering Minstrel', scryfallUrl: 'https://scryfall.com/card/fin/249/the-wandering-minstrel', copies: 1, language: '', treatment: ['foil', 'alternateArt', 'fullArt'], manaCost: '{G}{U}', colorIdentity: ['B', 'G', 'R', 'U', 'W'], cmc: 2, imageUrl: 'https://cards.scryfall.io/large/front/7/7/77bc419d-ff69-4e7c-afe6-faca383a5ed7.jpg?1783906560', price: 0.28, notes: 'Meglio se una versione bling (foil/alt art/full art)', player: 'Francesco Guzzonato' },
  { id: 12, date: '2025-10-25', found: false, cardName: 'Roiling Regrowth', scryfallUrl: 'https://scryfall.com/card/eoc/105/roiling-regrowth', copies: 1, language: 'fr', treatment: [], manaCost: '{2}{G}', colorIdentity: ['G'], cmc: 3, imageUrl: 'https://cards.scryfall.io/large/front/2/c/2c446dbb-b883-47e9-aab3-ac921ff218f8.jpg?1783906032', price: 0.31, notes: '', player: 'Lorenzo Castelli' },
  { id: 13, date: '2025-10-19', found: false, cardName: 'The One Ring', scryfallUrl: 'https://scryfall.com/card/ltr/246/the-one-ring', copies: 1, language: 'de', treatment: [], manaCost: '{4}', colorIdentity: [], cmc: 4, imageUrl: 'https://cards.scryfall.io/large/front/d/5/d5806e68-1054-458e-866d-1f2470f682b2.jpg?1783916239', price: 81.9, notes: '', player: 'Luca Botta' },
  { id: 14, date: '2025-10-09', found: false, cardName: 'Pramikon, Sky Rampart', scryfallUrl: 'https://scryfall.com/card/c19/47/pramikon-sky-rampart', copies: 1, language: '', treatment: [], manaCost: '{U}{R}{W}', colorIdentity: ['R', 'U', 'W'], cmc: 3, imageUrl: 'https://cards.scryfall.io/large/front/8/5/8569ad47-a243-402d-899f-4e6b17ea4e1e.jpg?1783932798', price: 2.89, notes: '', player: 'Francesco Guzzonato' },
  { id: 15, date: '2025-09-25', found: false, cardName: 'Birgi, God of Storytelling', scryfallUrl: 'https://scryfall.com/card/khm/123/birgi-god-of-storytelling-harnfel-horn-of-bounty', copies: 1, language: '', treatment: [], manaCost: '{2}{R}', colorIdentity: ['R'], cmc: 3, imageUrl: 'https://cards.scryfall.io/large/front/4/4/44657ab1-0a6a-4a5f-9688-86f239083821.jpg?1783928241', price: 23.8, notes: '', player: 'Antonella Giancotti' },
  { id: 16, date: '2025-09-23', found: false, cardName: 'Pawpatch Recruit', scryfallUrl: 'https://scryfall.com/card/blb/187/pawpatch-recruit', copies: 4, language: '', treatment: [], manaCost: '{G}', colorIdentity: ['G'], cmc: 1, imageUrl: 'https://cards.scryfall.io/large/front/7/d/7d4d88ba-0ee4-4f66-995b-2e50614f50ee.jpg?1783910805', price: 0.85, notes: '', player: 'Federico Toldo' },
  { id: 17, date: '2025-09-14', found: false, cardName: 'Dictate of Erebos', scryfallUrl: 'https://scryfall.com/card/jou/65/dictate-of-erebos', copies: 1, language: '', treatment: [], manaCost: '{3}{B}{B}', colorIdentity: ['B'], cmc: 5, imageUrl: 'https://cards.scryfall.io/large/front/9/f/9f06db70-95f9-41eb-8e5f-8bc56fd34c09.jpg?1783939437', price: 14.55, notes: '', player: 'Francesco Guzzonato' },
  { id: 18, date: '2025-08-26', found: false, cardName: 'Fear of Missing Out', scryfallUrl: 'https://scryfall.com/card/dsk/136/fear-of-missing-out', copies: 1, language: 'es', treatment: [], manaCost: '{1}{R}', colorIdentity: ['R'], cmc: 2, imageUrl: 'https://cards.scryfall.io/large/front/9/d/9d48aaff-46ab-411b-9456-171d4709f951.jpg?1783909470', price: 3.38, notes: '', player: 'Marco Cazzola' },
  { id: 19, date: '2025-08-26', found: false, cardName: 'Yoshimaru, Ever Faithful', scryfallUrl: 'https://scryfall.com/card/nec/32/yoshimaru-ever-faithful', copies: 1, language: '', treatment: [], manaCost: '{W}', colorIdentity: ['W'], cmc: 1, imageUrl: 'https://cards.scryfall.io/large/front/a/a/aa409269-3698-42a2-8c51-75557b27a6f6.jpg?1783923987', price: 8.2, notes: '', player: 'Carlo Milanaccio' },
  { id: 20, date: '2025-08-26', found: false, cardName: 'Invasion of Ikoria', scryfallUrl: 'https://scryfall.com/card/mom/190/invasion-of-ikoria-zilortha-apex-of-ikoria', copies: 2, language: '', treatment: [], manaCost: '{X}{G}{G}', colorIdentity: ['G'], cmc: 2, imageUrl: 'https://cards.scryfall.io/large/front/5/d/5d59c8f2-f6af-40a6-8dfe-8cc45bf231ce.jpg?1783916974', price: 6.97, notes: '', player: 'Carlo Milanaccio' },
  { id: 21, date: '2025-08-26', found: false, cardName: 'Earthcraft', scryfallUrl: 'https://scryfall.com/card/tmp/222/earthcraft', copies: 1, language: '', treatment: [], manaCost: '{1}{G}', colorIdentity: ['G'], cmc: 2, imageUrl: 'https://cards.scryfall.io/large/front/9/d/9dda7531-82a1-4f49-8858-601ddbc6e2bc.jpg?1783946620', price: 128.39, notes: '', player: 'Carlo Milanaccio' },
  { id: 22, date: '2025-08-26', found: false, cardName: 'Swift Reconfiguration', scryfallUrl: 'https://scryfall.com/card/nec/10/swift-reconfiguration', copies: 1, language: '', treatment: [], manaCost: '{W}', colorIdentity: ['W'], cmc: 1, imageUrl: 'https://cards.scryfall.io/large/front/9/7/975dcfab-0281-4fee-92aa-021ea6c524c7.jpg?1783923997', price: 6.68, notes: '', player: 'Carlo Milanaccio' },
  { id: 23, date: '2025-08-26', found: false, cardName: 'Enduring Vitality', scryfallUrl: 'https://scryfall.com/card/dsk/394/enduring-vitality', copies: 1, language: '', treatment: [], manaCost: '{1}{G}{G}', colorIdentity: ['G'], cmc: 3, imageUrl: 'https://cards.scryfall.io/large/front/2/9/2999c030-66c1-41f3-b59a-8ba1ef5a756c.jpg?1783909386', price: 24.58, notes: 'versione esatta', player: 'Carlo Milanaccio' },
  { id: 24, date: '2025-08-26', found: false, cardName: 'Gemstone Caverns', scryfallUrl: 'https://scryfall.com/card/tsr/280/gemstone-caverns', copies: 1, language: '', treatment: [], manaCost: '', colorIdentity: [], cmc: 0, imageUrl: 'https://cards.scryfall.io/large/front/7/f/7f273641-c5f3-48bc-b89e-3cff52d26a0b.jpg?1783927750', price: 36.77, notes: '', player: 'Carlo Milanaccio' },
  { id: 25, date: '2025-08-26', found: false, cardName: 'Will of the Sultai', scryfallUrl: 'https://scryfall.com/card/tdc/49/will-of-the-sultai', copies: 1, language: '', treatment: [], manaCost: '{4}{G}', colorIdentity: ['G'], cmc: 5, imageUrl: 'https://cards.scryfall.io/large/front/3/7/37155f69-1d72-4fcb-80b3-548b7d78f9ec.jpg?1783907165', price: 2.23, notes: '', player: 'Carlo Milanaccio' },
  { id: 26, date: '2025-08-26', found: false, cardName: 'Mistveil Plains', scryfallUrl: 'https://scryfall.com/card/shm/275/mistveil-plains', copies: 1, language: '', treatment: [], manaCost: '', colorIdentity: ['W'], cmc: 0, imageUrl: 'https://cards.scryfall.io/large/front/a/f/af06f923-0c89-42ae-a4a8-618be7f39cce.jpg?1783942706', price: 0.66, notes: '', player: 'Francesco Guzzonato' },
  { id: 27, date: '2025-08-25', found: false, cardName: 'Myr Convert', scryfallUrl: 'https://scryfall.com/card/one/234/myr-convert', copies: 1, language: 'en', treatment: [], manaCost: '{2}', colorIdentity: [], cmc: 2, imageUrl: 'https://cards.scryfall.io/large/front/9/d/9df0adcf-7ad0-4d70-8dcd-28f69471495b.jpg?1783917989', price: 0.16, notes: 'Non foil preferibilmente in inglese', player: 'Emanuele Nardi' },
  { id: 28, date: '2025-08-25', found: false, cardName: 'Gold Myr', scryfallUrl: 'https://scryfall.com/card/nec/153/gold-myr', copies: 1, language: 'en', treatment: [], manaCost: '{2}', colorIdentity: ['W'], cmc: 2, imageUrl: 'https://cards.scryfall.io/large/front/1/2/12331b1d-a561-4a8c-8e85-ed3a607ce508.jpg?1783923939', price: 0.47, notes: 'Non foil preferibilmente in inglese', player: 'Emanuele Nardi' },
  { id: 29, date: '2025-08-22', found: false, cardName: 'Dark Privilege', scryfallUrl: 'https://scryfall.com/card/vis/56/dark-privilege', copies: 1, language: '', treatment: [], manaCost: '{1}{B}', colorIdentity: ['B'], cmc: 2, imageUrl: 'https://cards.scryfall.io/large/front/1/0/10d2cf44-cc20-4a37-81ae-930f8c6d0896.jpg?1783946994', price: 0.46, notes: '', player: 'Francesco Guzzonato' },
  { id: 30, date: '2025-08-22', found: false, cardName: 'Doc Aurlock, Grizzled Genius', scryfallUrl: 'https://scryfall.com/card/otj/201/doc-aurlock-grizzled-genius', copies: 1, language: '', treatment: [], manaCost: '{G}{U}', colorIdentity: ['G', 'U'], cmc: 2, imageUrl: 'https://cards.scryfall.io/large/front/6/f/6fc27b30-8c8e-434c-a72c-e1d409efc1ae.jpg?1783911796', price: 0.27, notes: '', player: 'Francesco Guzzonato' },
  { id: 31, date: '2025-08-22', found: false, cardName: 'Grim Monolith', scryfallUrl: 'https://scryfall.com/card/ulg/126/grim-monolith', copies: 1, language: '', treatment: [], manaCost: '{2}', colorIdentity: [], cmc: 2, imageUrl: 'https://cards.scryfall.io/large/front/9/d/9ddc9fe1-17c8-4e1d-aeb8-c4214e881280.jpg?1783946223', price: 324.81, notes: '', player: 'Alessio Perini' },
  { id: 32, date: '2025-08-22', found: false, cardName: 'Hour of Victory', scryfallUrl: 'https://scryfall.com/card/dft/91/hour-of-victory', copies: 1, language: '', treatment: [], manaCost: '{2}{B}', colorIdentity: ['B'], cmc: 3, imageUrl: 'https://cards.scryfall.io/large/front/9/1/9192abc8-05a3-4e72-a634-fc5acbe97b26.jpg?1783907894', price: 0.14, notes: '', player: 'Marco Cazzola' },
  { id: 33, date: '2025-08-22', found: false, cardName: 'Isola Tropicale', scryfallUrl: 'https://scryfall.com/card/3ed/288/it/isola-tropicale-(tropical-island)', copies: 1, language: 'it', treatment: [], manaCost: '', colorIdentity: ['G', 'U'], cmc: 0, imageUrl: 'https://cards.scryfall.io/large/front/a/0/a0f5c6bc-65dc-42a1-a62d-a0b101310a1f.jpg?1783948276', price: 396.06, notes: '', player: 'Omar A. Zanoni' },
  { id: 34, date: '2025-08-22', found: false, cardName: 'Isola Vulcanica', scryfallUrl: 'https://scryfall.com/card/3ed/291/it/isola-vulcanica-(volcanic-island)', copies: 1, language: 'ja', treatment: [], manaCost: '', colorIdentity: ['R', 'U'], cmc: 0, imageUrl: 'https://cards.scryfall.io/large/front/b/1/b12e5430-0e80-47dd-80ac-85728b656a24.jpg?1783948277', price: 556.42, notes: '', player: 'Omar A. Zanoni' },
  { id: 35, date: '2025-08-22', found: false, cardName: 'Malleable Impostor', scryfallUrl: 'https://scryfall.com/card/woc/10/malleable-impostor', copies: 1, language: '', treatment: [], manaCost: '{3}{U}', colorIdentity: ['U'], cmc: 4, imageUrl: 'https://cards.scryfall.io/large/front/a/d/ad0fc934-f49d-4607-a52b-aea5c1d5d342.jpg?1783914989', price: 7.69, notes: '', player: 'Alessandro Pernici' },
  { id: 36, date: '2025-08-22', found: false, cardName: 'Mox Amber', scryfallUrl: 'https://scryfall.com/card/dom/224/mox-amber', copies: 1, language: '', treatment: [], manaCost: '{0}', colorIdentity: [], cmc: 0, imageUrl: 'https://cards.scryfall.io/large/front/6/6/66024e69-ad60-4c9a-a0ca-da138d33ad80.jpg?1783934955', price: 54.33, notes: '', player: 'Lorenzo Asinari' },
  { id: 37, date: '2025-08-22', found: false, cardName: 'Mox Diamond', scryfallUrl: 'https://scryfall.com/card/sth/138/mox-diamond', copies: 1, language: '', treatment: [], manaCost: '{0}', colorIdentity: [], cmc: 0, imageUrl: 'https://cards.scryfall.io/large/front/2/8/28028830-83ed-45e2-b495-3b9ad9d3e988.jpg?1783946538', price: 740.18, notes: '', player: 'Omar A. Zanoni' },
  { id: 38, date: '2025-08-22', found: false, cardName: 'Mox Diamond', scryfallUrl: 'https://scryfall.com/card/sth/138/mox-diamond', copies: 1, language: '', treatment: [], manaCost: '{0}', colorIdentity: [], cmc: 0, imageUrl: 'https://cards.scryfall.io/large/front/2/8/28028830-83ed-45e2-b495-3b9ad9d3e988.jpg?1783946538', price: 740.18, notes: '', player: 'Alessio Perini' },
  { id: 39, date: '2025-08-22', found: false, cardName: 'Phyrexian Altar', scryfallUrl: 'https://scryfall.com/card/2x2/311/phyrexian-altar', copies: 1, language: '', treatment: [], manaCost: '{3}', colorIdentity: [], cmc: 3, imageUrl: 'https://cards.scryfall.io/large/front/9/5/95d9f93c-50a8-41a9-be98-d1900bf1c12f.jpg?1783921789', price: 41.4, notes: '', player: 'Francesco Guzzonato' },
  { id: 40, date: '2025-08-22', found: false, cardName: 'Sensei\'s Divining Top', scryfallUrl: 'https://scryfall.com/card/ema/232/senseis-divining-top', copies: 1, language: '', treatment: [], manaCost: '{1}', colorIdentity: [], cmc: 1, imageUrl: 'https://cards.scryfall.io/large/front/8/3/83c01c91-ea01-46c7-b94c-97777b968459.jpg?1783937541', price: 23.84, notes: '', player: 'Francesco Guzzonato' },
  { id: 41, date: '2025-08-22', found: false, cardName: 'Tinybones Joins Up', scryfallUrl: 'https://scryfall.com/card/otj/108/tinybones-joins-up', copies: 1, language: '', treatment: [], manaCost: '{B}', colorIdentity: ['B'], cmc: 1, imageUrl: 'https://cards.scryfall.io/large/front/5/7/5724a15f-0ba0-421a-9cd4-a2b701e6141f.jpg?1783911826', price: 0.52, notes: '', player: 'Alessio Perini' },
  { id: 42, date: '2025-08-22', found: false, cardName: 'Transit Mage', scryfallUrl: 'https://scryfall.com/card/dft/70/transit-mage', copies: 1, language: '', treatment: [], manaCost: '{2}{U}', colorIdentity: ['U'], cmc: 3, imageUrl: 'https://cards.scryfall.io/large/front/6/7/6727169f-c33a-4ca5-889d-a63bcfc5a3f0.jpg?1783907900', price: 0.22, notes: '', player: 'Francesco Guzzonato' },
  { id: 43, date: '2025-08-22', found: false, cardName: 'Warden of the Grove', scryfallUrl: 'https://scryfall.com/card/tdm/166/warden-of-the-grove', copies: 1, language: '', treatment: [], manaCost: '{2}{G}', colorIdentity: ['G'], cmc: 3, imageUrl: 'https://cards.scryfall.io/large/front/2/4/2414db96-0e2b-4f7c-9b97-41f8e310b752.jpg?1783907330', price: 1.6, notes: '', player: 'Roberto Gelmini' },
  { id: 44, date: '2025-08-22', found: false, cardName: 'Warren Soultrader', scryfallUrl: 'https://scryfall.com/card/mh3/110/warren-soultrader', copies: 1, language: '', treatment: [], manaCost: '{2}{B}', colorIdentity: ['B'], cmc: 3, imageUrl: 'https://cards.scryfall.io/large/front/b/3/b334e4c6-d316-4141-8889-f95afcc04701.jpg?1784634565', price: 13.96, notes: '', player: 'Francesco Guzzonato' },
  { id: 45, date: '2025-08-22', found: false, cardName: 'Wastewood Verge', scryfallUrl: 'https://scryfall.com/card/dft/268/wastewood-verge', copies: 1, language: '', treatment: [], manaCost: '', colorIdentity: ['B', 'G'], cmc: 0, imageUrl: 'https://cards.scryfall.io/large/front/5/c/5ceacc7d-d407-4f82-af58-9bdf8426924e.jpg?1783907837', price: 8.19, notes: '', player: 'Marco Cazzola' }
])

function toggleFound(id: number) {
  const row = data.value.find(item => item.id === id)
  if (row) row.found = !row.found
}

function toggleTreatmentFilter(value: string) {
  const index = treatmentFilter.value.indexOf(value)
  if (index === -1) treatmentFilter.value = [...treatmentFilter.value, value]
  else treatmentFilter.value = treatmentFilter.value.filter(item => item !== value)
}

const languageFlags: Record<string, string> = {
  en: 'i-circle-flags-gb',
  it: 'i-circle-flags-it',
  es: 'i-circle-flags-es',
  fr: 'i-circle-flags-fr',
  de: 'i-circle-flags-de',
  ja: 'i-circle-flags-jp'
}

const columns: TableColumn<WantedCard>[] = [
  {
    accessorKey: 'player',
    header: ({ column }) => sortableHeader(t('wantedCard.columns.player'), column),
    // Ordina i gruppi per numero di richieste (subRows), non alfabeticamente
    // per nome — è quello che serve davvero quando la tabella è raggruppata.
    sortingFn: (rowA, rowB) => (rowA.subRows?.length ?? 0) - (rowB.subRows?.length ?? 0),
    cell: ({ row, getValue }) => {
      if (!row.getIsGrouped()) return h(PlayerTag, { name: getValue<string>() })
      return h('button', {
        type: 'button',
        class: 'flex items-center gap-1.5 font-medium cursor-pointer',
        onClick: () => row.toggleExpanded()
      }, [
        h(UIcon, { name: row.getIsExpanded() ? 'i-lucide-chevron-down' : 'i-lucide-chevron-right', class: 'size-4' }),
        h(PlayerTag, { name: getValue<string>() }),
        h(UBadge, { color: 'neutral', variant: 'subtle', size: 'sm' }, () => String(row.subRows.length))
      ])
    }
  },
  {
    accessorKey: 'cmc',
    header: ({ column }) => sortableHeader(t('wantedCard.columns.manaCost'), column),
    // Ordinamento da collezione convenzionale MTG: prima il gruppo colore
    // (W, U, B, R, G, multicolore, incolore), poi il costo di mana crescente
    // — stesso algoritmo di MagicTheGathering/league (colorGroupRank).
    sortingFn: (rowA, rowB) => {
      const colorDiff = colorGroupRank(rowA.original.colorIdentity) - colorGroupRank(rowB.original.colorIdentity)
      return colorDiff !== 0 ? colorDiff : rowA.original.cmc - rowB.original.cmc
    },
    cell: ({ row }) => row.getIsGrouped() ? null : h(ManaCost, { manaCost: row.original.manaCost, size: 'sm' })
  },
  {
    accessorKey: 'cardName',
    header: ({ column }) => sortableHeader(t('wantedCard.columns.name'), column),
    filterFn: 'includesString',
    // Niente più link a Scryfall al click: su mobile l'hover non esiste, e
    // CardPreviewTooltip gestisce già il tap con una modale a schermo intero
    // — stesso comportamento di magic/card/Tooltip.vue in MagicTheGathering/blog.
    cell: ({ row }) => row.getIsGrouped()
      ? null
      : h(CardPreviewTooltip, { name: row.original.cardName, imageUrl: row.original.imageUrl })
  },
  {
    accessorKey: 'price',
    header: ({ column }) => sortableHeader(t('wantedCard.columns.price'), column),
    cell: ({ row }) => {
      if (row.getIsGrouped() || row.original.price === null) return null
      return `${row.original.price.toFixed(2)} €`
    }
  },
  {
    accessorKey: 'copies',
    header: ({ column }) => sortableHeader(t('wantedCard.columns.copies'), column),
    cell: ({ row }) => row.getIsGrouped() ? null : row.original.copies
  },
  {
    accessorKey: 'language',
    header: ({ column }) => sortableHeader(t('wantedCard.columns.language'), column),
    filterFn: 'equals',
    cell: ({ row }) => {
      if (row.getIsGrouped()) return null
      const language = row.original.language || 'any'
      return h('div', { class: 'flex items-center gap-1.5' }, [
        h(UIcon, { name: languageFlags[language] ?? 'i-lucide-languages', class: 'size-4 shrink-0' }),
        t(`wantedCard.languages.${language}`)
      ])
    }
  },
  {
    accessorKey: 'treatment',
    header: t('wantedCard.columns.treatment'),
    filterFn: 'arrIncludesSome',
    // Il valore di colonna è già un array (più trattamenti per riga): serve
    // spacchettarlo per far contare a getFacetedUniqueValues() ogni singolo
    // trattamento, non l'intero array come "un" valore unico.
    getUniqueValues: (row: WantedCard) => row.treatment,
    cell: ({ row }) => row.getIsGrouped()
      ? null
      : h('div', { class: 'flex flex-wrap gap-1' },
          row.original.treatment.map(value => h(UBadge, { key: value, color: 'neutral', variant: 'subtle', size: 'sm' }, () => t(`wantedCard.treatments.${value}`)))
        )
  },
  {
    accessorKey: 'date',
    header: ({ column }) => sortableHeader(t('wantedCard.columns.date'), column),
    cell: ({ row }) => row.getIsGrouped() ? null : row.original.date
  },
  {
    accessorKey: 'found',
    header: ({ column }) => sortableHeader(t('wantedCard.columns.found'), column),
    filterFn: 'equals',
    cell: ({ row }) => {
      if (row.getIsGrouped()) return null
      return h(UBadge, {
        color: row.original.found ? 'success' : 'warning',
        variant: 'subtle',
        class: 'cursor-pointer',
        onClick: () => toggleFound(row.original.id)
      }, () => row.original.found ? t('wantedCard.foundYes') : t('wantedCard.foundNo'))
    }
  },
  {
    accessorKey: 'notes',
    header: t('wantedCard.columns.notes'),
    meta: { class: { td: 'text-muted max-w-64 whitespace-normal break-words' } },
    cell: ({ row }) => row.getIsGrouped() ? null : row.original.notes
  }
]
</script>

<template>
  <UDashboardPanel id="wanted-cards">
    <template #header>
      <UDashboardNavbar :title="$t('wantedCard.breadcrumb')">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <WantedCardsListAddModal />
        </template>
      </UDashboardNavbar>

      <!-- UDashboardToolbar nel #header, come HomeDateRangePicker in
           transactions/index.vue — #left/#right sono lo split ufficiale
           filtri/vista (flex justify-between). Stato e Trattamento
           condividono lo stesso linguaggio visivo (UFieldGroup di bottoni
           toggle) invece di mischiare UTabs (pillole) con bottoni piatti. -->
      <UDashboardToolbar :ui="{ left: 'gap-4' }">
        <template #left>
          <!-- No `-ms-1` here on purpose: it's for icon-only buttons (see transactions/index.vue), not a bordered UFieldGroup — measured, it already aligns with the table (105px vs 106px) without it. -->
          <UFieldGroup>
            <UButton
              v-for="option in statusTabs"
              :key="option.value"
              :label="option.label"
              color="neutral"
              :variant="statusFilter === option.value ? 'solid' : 'outline'"
              @click="statusFilter = option.value"
            />
          </UFieldGroup>

          <UInput
            v-model="cardNameFilter"
            icon="i-lucide-search"
            :placeholder="$t('wantedCard.filters.cardNamePlaceholder')"
          />

          <USelectMenu
            v-model="languageFilter"
            :items="languageFacetItems"
            value-key="value"
            :icon="selectedLanguage?.icon"
            :placeholder="$t('wantedCard.filters.languagePlaceholder')"
            :ui="{ content: 'max-h-none' }"
            class="w-40"
          />

          <UFieldGroup>
            <UButton
              v-for="option in treatmentFacetItems"
              :key="option.value"
              :label="option.label"
              color="neutral"
              :variant="treatmentFilter.includes(option.value) ? 'solid' : 'outline'"
              @click="toggleTreatmentFilter(option.value)"
            />
          </UFieldGroup>
        </template>

        <template #right>
          <UDropdownMenu :items="viewItems" :content="{ align: 'end' }">
            <UButton
              :label="$t('wantedCard.filters.view')"
              color="neutral"
              variant="outline"
              trailing-icon="i-lucide-chevron-down"
            />
          </UDropdownMenu>
        </template>
      </UDashboardToolbar>
    </template>

    <template #body>
      <UTable
        ref="table"
        v-model:sorting="sorting"
        v-model:column-visibility="columnVisibility"
        :column-filters="columnFilters"
        :data="data"
        :columns="columns"
        :grouping="grouping"
        :grouping-options="{
          getGroupedRowModel: getGroupedRowModel()
        }"
        :faceted-options="{
          getFacetedRowModel: getFacetedRowModel(),
          getFacetedUniqueValues: getFacetedUniqueValues()
        }"
        :ui="{ td: 'empty:p-0' }"
        class="w-full"
      />
    </template>
  </UDashboardPanel>
</template>
