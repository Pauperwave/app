// app\composables\useScryfallCardSearch.ts
// Live Scryfall card search for "New request", with no local catalogue (unlike league's
// useCommanderSearch, which filters an already synced commander table): a shared catalogue would
// mean modelling every printing of every card (~110-120k rows per Scryfall's bulk data), more work
// than it is worth until commanders need it too (see docs/TODO.md).
//
// Two phases, like CommanderSearch.vue (USelectMenu + search-term + debounce): 1) name autocomplete
// (strings only), 2) once a name is picked, every printing of that card, so the exact edition and
// artwork can be chosen

export interface ScryfallPrinting {
  id: string
  name: string
  set: string
  setName: string
  collectorNumber: string
  typeLine: string
  imageUrl: string | null
  // Cropped illustration only (no frame/text), used by CardArtPicker.vue for cover-image selection
  artCropUrl: string | null
  // Required with any artCropUrl use per Scryfall's API guidelines (the crop has no in-image
  // credit), see CardArtPicker.vue
  artist: string | null
  manaCost: string
  colorIdentity: string[]
  cmc: number
  scryfallUrl: string
  // Transform/modal DFCs (two faces, each with its own image), not split cards (Fire // Ice), which
  // share one image
  isDoubleFaced: boolean
  backImageUrl: string | null
  backManaCost: string | null
  // "nonfoil" | "foil" | "etched": the finishes THIS printing exists in
  finishes: string[]
  // Non-foil price of this printing in EUR (null when Scryfall has none, e.g. very rare or very new
  // printings)
  price: number | null
}

interface ScryfallApiCardFace {
  image_uris?: { normal?: string, large?: string, art_crop?: string }
  mana_cost?: string
  artist?: string
}

interface ScryfallApiCard {
  id: string
  name: string
  set: string
  set_name: string
  collector_number: string
  type_line?: string
  mana_cost?: string
  color_identity?: string[]
  cmc?: number
  scryfall_uri: string
  image_uris?: { normal?: string, large?: string, art_crop?: string }
  card_faces?: ScryfallApiCardFace[]
  finishes?: string[]
  prices?: { eur?: string | null }
  artist?: string
}

function parsePrice(value: string | null | undefined): number | null {
  if (!value) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

// Flagged cyclomatic 26, but every point is a ??/?. (no if/switch/loop) reflecting Scryfall's
// inconsistent card-face shape (a double-faced card stores image/mana-cost on the *face*):
// splitting would only spread the same chains across functions fallow-ignore-next-line complexity
function toPrinting(card: ScryfallApiCard): ScryfallPrinting {
  // Double-faced cards carry image_uris on the face, not the card: the first face stands in as
  // representative
  const frontFace = card.image_uris ? card : card.card_faces?.[0]
  const backFace = !card.image_uris ? card.card_faces?.[1] : undefined
  const isDoubleFaced = !!backFace?.image_uris

  return {
    id: card.id,
    name: card.name,
    set: card.set,
    setName: card.set_name,
    collectorNumber: card.collector_number,
    typeLine: card.type_line ?? '',
    imageUrl: frontFace?.image_uris?.normal ?? frontFace?.image_uris?.large ?? null,
    artCropUrl: frontFace?.image_uris?.art_crop ?? null,
    artist: card.artist ?? frontFace?.artist ?? null,
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

export interface ScryfallCardSuggestion {
  name: string
  manaCost: string
  imageUrl: string | null
}

// /cards/search returns ~175 results per page: a typeahead needs the first few, the user narrows by
// typing on
const SUGGESTION_LIMIT = 20

export function useScryfallCardSearch() {
  const query = ref('')
  const nameSuggestions = ref<ScryfallCardSuggestion[]>([])
  const isSuggesting = ref(false)

  // /cards/search rather than /cards/autocomplete (strings only): the mana cost is needed with the
  // name. The full search syntax also works, so `game:paper` excludes digital-only Alchemy cards
  // (instead of filtering their "A-" prefix client-side)
  async function fetchSuggestions(q: string) {
    const trimmed = q.trim()
    if (trimmed.length < 2) {
      nameSuggestions.value = []
      return
    }

    isSuggesting.value = true
    try {
      const response = await $fetch<{ data: ScryfallApiCard[] }>('https://api.scryfall.com/cards/search', {
        query: { q: `${trimmed} game:paper`, unique: 'cards', order: 'name' }
      })
      nameSuggestions.value = (response.data ?? []).slice(0, SUGGESTION_LIMIT).map(card => ({
        name: card.name,
        // Double-faced cards have no top-level mana_cost/image_uris: they sit on the front face, as
        // in toPrinting()
        manaCost: card.mana_cost || card.card_faces?.[0]?.mana_cost || '',
        imageUrl: card.image_uris?.normal
          ?? card.card_faces?.[0]?.image_uris?.normal
          ?? null
      }))
    } catch {
      // /cards/search answers 404 when nothing matches: normal for a typeahead while typing, not an
      // error
      nameSuggestions.value = []
    } finally {
      isSuggesting.value = false
    }
  }

  const debouncedFetchSuggestions = useDebounceFn(fetchSuggestions, 200)
  watch(query, q => debouncedFetchSuggestions(q))

  // Each printing row shows its image on hover (see PrintingRow.vue): without preloading, the first
  // hover starts empty. It runs in the background without blocking the UI; on failure the hover
  // falls back to normal lazy loading
  function preloadImages(list: ScryfallPrinting[]) {
    if (import.meta.server) return
    for (const printing of list) {
      if (!printing.imageUrl) continue
      const img = new Image()
      img.src = printing.imageUrl
    }
  }

  // Name of the card whose printings are shown: it drives the query below so Pinia Colada keeps
  // seen printings cached (RAM + localStorage via PiniaColadaCachePersister in colada.options.ts),
  // with no new Scryfall call on return to a searched name
  const selectedCardName = ref<string>()

  const { data: printingsData, isLoading: isLoadingPrintings } = useQuery({
    key: () => ['scryfall-printings', selectedCardName.value ?? ''],
    enabled: () => !!selectedCardName.value,
    query: async (): Promise<ScryfallPrinting[]> => {
      // game:paper excludes digital-only printings (Arena/MTGO, Alchemy): the full search syntax
      // works here, unlike /cards/autocomplete
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
