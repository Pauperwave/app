// app\composables\useScryfallCardSearch.ts
// Live Scryfall card search for "New request" — no local catalogue (unlike
// MagicTheGathering/league's useCommanderSearch, which filters an already synced
// commander table client-side): building a shared catalogue would mean modelling
// every single printing of every card (~110-120k rows according to Scryfall's bulk
// data), not just the name — more work than it is worth until the commanders need
// it too. See the TODO in docs/TODO.md.
//
// Two phases, same UI pattern as CommanderSearch.vue (USelectMenu + search-term +
// debounce): 1) autocomplete on the name (lightweight, strings only), 2) once a
// name is picked, every existing printing of that card, so the exact edition and
// artwork can be chosen — which is why the live search beat a catalogue storing a
// single printing per name.

export interface ScryfallPrinting {
  id: string
  name: string
  set: string
  setName: string
  collectorNumber: string
  typeLine: string
  imageUrl: string | null
  manaCost: string
  colorIdentity: string[]
  cmc: number
  scryfallUrl: string
  // Transform/modal DFCs (two faces, each with its own image) — not split cards
  // (e.g. Fire // Ice), which share a single image.
  isDoubleFaced: boolean
  backImageUrl: string | null
  backManaCost: string | null
  // "nonfoil" | "foil" | "etched" — which finishes exist for THIS specific
  // printing (not every printing has a foil version).
  finishes: string[]
  // Non-foil price of this specific printing in EUR (null when Scryfall has none
  // for it — happens with very rare or very new printings).
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
  type_line?: string
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

// Flagged cyclomatic 26, but every point is a ??/?. operator (no if/switch/
// loop anywhere) reflecting Scryfall's genuinely inconsistent card-face
// shape (a double-faced card stores image/mana-cost on the *face*, not the
// card — see the comment below). Splitting into smaller functions would
// just redistribute the same ??/?. chains across more functions, not
// reduce them.
// fallow-ignore-next-line complexity
function toPrinting(card: ScryfallApiCard): ScryfallPrinting {
  // Double-faced cards (transform/modal) carry image_uris on the individual face,
  // not on the card — the first face stands in as the representative one.
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

// /cards/search returns ~175 results per page: a typeahead only needs the first
// few, the user narrows the rest by carrying on typing.
const SUGGESTION_LIMIT = 20

export function useScryfallCardSearch() {
  const query = ref('')
  const nameSuggestions = ref<ScryfallCardSuggestion[]>([])
  const isSuggesting = ref(false)

  // /cards/search rather than /cards/autocomplete: the latter returns strings
  // only, while the mana cost is needed alongside the name (same pattern as
  // CommanderSuggestionRow.vue in league, which reads it from a local catalogue
  // instead of the API). The full search syntax also works here, so `game:paper`
  // excludes Alchemy cards — digital only, not playable in paper — replacing the
  // client-side filter on their "A-" name prefix that autocomplete required.
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
        // Double-faced cards have no top-level mana_cost/image_uris: they sit on
        // the front face, as in toPrinting().
        manaCost: card.mana_cost || card.card_faces?.[0]?.mana_cost || '',
        imageUrl: card.image_uris?.normal
          ?? card.card_faces?.[0]?.image_uris?.normal
          ?? null
      }))
    } catch {
      // /cards/search answers 404 when no card matches: for a typeahead that is
      // normal while typing, not an error.
      nameSuggestions.value = []
    } finally {
      isSuggesting.value = false
    }
  }

  const debouncedFetchSuggestions = useDebounceFn(fetchSuggestions, 200)
  watch(query, q => debouncedFetchSuggestions(q))

  // Each printing row only shows its image on hover (see PrintingRow.vue) —
  // without preloading here, the first hover on every printing starts empty and
  // the network delay shows. The preload runs in the background and does not block
  // the UI: if it fails (slow network, printing without an image) the hover still
  // falls back to normal lazy loading.
  function preloadImages(list: ScryfallPrinting[]) {
    if (import.meta.server) return
    for (const printing of list) {
      if (!printing.imageUrl) continue
      const img = new Image()
      img.src = printing.imageUrl
    }
  }

  // Name of the card whose printings are shown — it drives the query below rather
  // than being passed straight from fetchPrintings() as before: this lets Pinia
  // Colada keep already-seen printings cached (RAM + localStorage via
  // PiniaColadaCachePersister in colada.options.ts), with no new Scryfall call
  // when the user returns to a name searched in this session or an earlier one.
  const selectedCardName = ref<string>()

  const { data: printingsData, isLoading: isLoadingPrintings } = useQuery({
    key: () => ['scryfall-printings', selectedCardName.value ?? ''],
    enabled: () => !!selectedCardName.value,
    query: async (): Promise<ScryfallPrinting[]> => {
      // game:paper excludes digital-only printings (Arena/MTGO, Alchemy included)
      // — Scryfall's full search syntax works here, unlike /cards/autocomplete
      // above.
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
