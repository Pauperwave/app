// app\composables\useScryfallCardSearch.ts
// Ricerca carta live su Scryfall per "Nuova richiesta" — niente catalogo
// locale (a differenza di MagicTheGathering/league's useCommanderSearch,
// che filtra client-side una tabella di comandanti già sincronizzata):
// costruire un catalogo condiviso richiederebbe modellare ogni singola
// stampa di ogni carta (~110-120k righe secondo i bulk data di Scryfall),
// non solo il nome — più lavoro di quanto valga finché non serve anche per
// i comandanti. Vedi TODO in docs/TODO.md.
//
// Due fasi, stesso pattern UI di CommanderSearch.vue (USelectMenu +
// search-term + debounce): 1) autocomplete sul nome (leggero, solo
// stringhe), 2) una volta scelto il nome, tutte le stampe esistenti di
// quella carta, per lasciare scegliere l'edizione/artwork esatta — motivo
// per cui la ricerca live conveniva rispetto a un catalogo che memorizza
// una sola stampa per nome.

export interface ScryfallPrinting {
  id: string
  name: string
  set: string
  setName: string
  collectorNumber: string
  imageUrl: string | null
  manaCost: string
  colorIdentity: string[]
  cmc: number
  scryfallUrl: string
  // Transform/modal-DFC (due facce con immagine propria ciascuna) — non le
  // carte split (es. Fire // Ice), che condividono una sola immagine.
  isDoubleFaced: boolean
  backImageUrl: string | null
  backManaCost: string | null
  // "nonfoil" | "foil" | "etched" — quali finiture esistono per QUESTA
  // stampa specifica (non tutte le stampe hanno una versione foil).
  finishes: string[]
  // Prezzo non-foil di questa stampa specifica in EUR (null se Scryfall non
  // ne ha uno per questa stampa — succede per stampe molto rare/nuove).
  price: number | null
}

interface ScryfallApiCardFace {
  image_uris?: { normal?: string, large?: string }
  mana_cost?: string
}

interface ScryfallApiCard {
  id: string
  name: string
  set: string
  set_name: string
  collector_number: string
  mana_cost?: string
  color_identity?: string[]
  cmc?: number
  scryfall_uri: string
  image_uris?: { normal?: string, large?: string }
  card_faces?: ScryfallApiCardFace[]
  finishes?: string[]
  prices?: { eur?: string | null }
}

function parsePrice(value: string | null | undefined): number | null {
  if (!value) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function toPrinting(card: ScryfallApiCard): ScryfallPrinting {
  // Le carte a due facce (transform/modal) hanno image_uris sulla singola
  // faccia, non sulla carta — si usa la prima faccia come rappresentativa.
  const frontFace = card.image_uris ? card : card.card_faces?.[0]
  const backFace = !card.image_uris ? card.card_faces?.[1] : undefined
  const isDoubleFaced = !!backFace?.image_uris

  return {
    id: card.id,
    name: card.name,
    set: card.set,
    setName: card.set_name,
    collectorNumber: card.collector_number,
    imageUrl: frontFace?.image_uris?.normal ?? frontFace?.image_uris?.large ?? null,
    manaCost: card.mana_cost ?? card.card_faces?.[0]?.mana_cost ?? '',
    colorIdentity: card.color_identity ?? [],
    cmc: card.cmc ?? 0,
    scryfallUrl: card.scryfall_uri,
    isDoubleFaced,
    backImageUrl: isDoubleFaced
      ? (backFace?.image_uris?.normal ?? backFace?.image_uris?.large ?? null)
      : null,
    backManaCost: isDoubleFaced ? (backFace?.mana_cost ?? null) : null,
    finishes: card.finishes ?? [],
    price: parsePrice(card.prices?.eur)
  }
}

export function useScryfallCardSearch() {
  const query = ref('')
  const nameSuggestions = ref<string[]>([])
  const isSuggesting = ref(false)

  async function fetchSuggestions(q: string) {
    const trimmed = q.trim()
    if (trimmed.length < 2) {
      nameSuggestions.value = []
      return
    }

    isSuggesting.value = true
    try {
      const response = await $fetch<{ data: string[] }>('https://api.scryfall.com/cards/autocomplete', {
        query: { q: trimmed }
      })
      // /cards/autocomplete non supporta la sintassi di ricerca di Scryfall
      // (niente game:paper qui), quindi le carte Alchemy — solo digitali,
      // non giocabili su carta — si filtrano lato client sul prefisso "A-"
      // della loro convenzione di nome (es. "A-Lightning Bolt").
      nameSuggestions.value = (response.data ?? []).filter(name => !name.startsWith('A-'))
    } catch {
      nameSuggestions.value = []
    } finally {
      isSuggesting.value = false
    }
  }

  const debouncedFetchSuggestions = useDebounceFn(fetchSuggestions, 200)
  watch(query, q => debouncedFetchSuggestions(q))

  // La riga di ogni stampa mostra l'immagine solo al passaggio del mouse
  // (vedi PrintingRow.vue) — senza precaricarle qui, il primo hover su ogni
  // stampa parte a vuoto e si vede il ritardo di rete. Il precaricamento gira
  // in background, non blocca la UI: se fallisce (rete lenta, stampa senza
  // immagine) l'hover ricadrà comunque sul normale caricamento lazy.
  function preloadImages(list: ScryfallPrinting[]) {
    if (import.meta.server) return
    for (const printing of list) {
      if (!printing.imageUrl) continue
      const img = new Image()
      img.src = printing.imageUrl
    }
  }

  // Nome carta il cui set di stampe è mostrato — driver della query sotto,
  // non passato direttamente da fetchPrintings() come prima: così Pinia
  // Colada tiene le stampe già viste in cache (ram + localStorage via
  // PiniaColadaCachePersister in colada.options.ts), niente nuova chiamata a
  // Scryfall se l'utente torna su un nome già cercato in questa sessione o
  // in una precedente.
  const selectedCardName = ref<string>()

  const { data: printingsData, isLoading: isLoadingPrintings } = useQuery({
    key: () => ['scryfall-printings', selectedCardName.value ?? ''],
    enabled: () => !!selectedCardName.value,
    query: async (): Promise<ScryfallPrinting[]> => {
      // game:paper esclude le stampe solo digitali (Arena/MTGO, incluso
      // Alchemy) — qui la sintassi di ricerca completa di Scryfall funziona,
      // a differenza di /cards/autocomplete sopra.
      const response = await $fetch<{ data: ScryfallApiCard[] }>('https://api.scryfall.com/cards/search', {
        query: { q: `!"${selectedCardName.value}" game:paper`, unique: 'prints', order: 'released', dir: 'desc' }
      })
      const list = (response.data ?? []).map(toPrinting)
      preloadImages(list)
      return list
    }
  })

  const printings = computed(() => selectedCardName.value ? (printingsData.value ?? []) : [])

  function fetchPrintings(cardName: string | undefined) {
    selectedCardName.value = cardName
  }

  return {
    query,
    nameSuggestions,
    isSuggesting,
    printings,
    isLoadingPrintings,
    fetchPrintings
  }
}
