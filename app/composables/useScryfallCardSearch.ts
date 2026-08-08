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
    backImageUrl: isDoubleFaced ? (backFace?.image_uris?.normal ?? backFace?.image_uris?.large ?? null) : null,
    backManaCost: isDoubleFaced ? (backFace?.mana_cost ?? null) : null,
    finishes: card.finishes ?? [],
    price: parsePrice(card.prices?.eur)
  }
}

export function useScryfallCardSearch() {
  const query = ref('')
  const nameSuggestions = ref<string[]>([])
  const isSuggesting = ref(false)

  const printings = ref<ScryfallPrinting[]>([])
  const isLoadingPrintings = ref(false)

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

  async function fetchPrintings(cardName: string) {
    isLoadingPrintings.value = true
    printings.value = []
    try {
      // game:paper esclude le stampe solo digitali (Arena/MTGO, incluso
      // Alchemy) — qui la sintassi di ricerca completa di Scryfall funziona,
      // a differenza di /cards/autocomplete sopra.
      const response = await $fetch<{ data: ScryfallApiCard[] }>('https://api.scryfall.com/cards/search', {
        query: { q: `!"${cardName}" game:paper`, unique: 'prints', order: 'released', dir: 'desc' }
      })
      printings.value = (response.data ?? []).map(toPrinting)
    } catch {
      printings.value = []
    } finally {
      isLoadingPrintings.value = false
    }
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
