// app\composables\wantedCards\useWantedCardsFilters.ts
import type { Ref } from 'vue'
import type { WantedCard, WantedCardStatus } from '~/types'

export type WantedCardColorFilter = 'all' | 'W' | 'U' | 'B' | 'G' | 'R' | 'C' | 'land'

export function useWantedCardsFilters(data: Ref<WantedCard[]>) {
  const { t } = useI18n()

  const currentAssociate = useCurrentAssociate()

  const cardNameFilter = ref('')
  // "Searching" by default — cards already found or abandoned stay hidden until
  // another tab is explicitly chosen.
  const statusFilter = ref<'all' | WantedCardStatus>('searching')
  // Replaces the old language select + foil toggle (2026-08-15 user request) —
  // color identity/land is the more useful axis for "does someone have a card
  // I could trade for this". Multi-select (2026-08-15 follow-up): several tabs
  // can be active together as a subset filter (cardMatchesColor below) —
  // clicking "Tutte" clears the set back to "no filter".
  const colorFilters = ref<Exclude<WantedCardColorFilter, 'all'>[]>([])

  function toggleColorFilter(value: WantedCardColorFilter) {
    if (value === 'all') {
      colorFilters.value = []
      return
    }
    colorFilters.value = colorFilters.value.includes(value)
      ? colorFilters.value.filter(active => active !== value)
      : [...colorFilters.value, value]
  }

  const onlyMine = ref(false)

  function cardMatchesColor(card: WantedCard, selected: Exclude<WantedCardColorFilter, 'all'>[]): boolean {
    if (selected.length === 0) return true

    // typeLine is null for requests created before migration 20260815090000
    // that haven't been backfilled yet (scripts/backfill-wanted-cards-type-line.mjs)
    // — they just never match "land", same as any other unresolved filter value.
    const isLand = (card.typeLine ?? '').includes('Land')
    const colors = selected.filter((value): value is Exclude<WantedCardColorFilter, 'all' | 'C' | 'land'> =>
      value !== 'C' && value !== 'land')
    const hasColorless = selected.includes('C')
    const hasLand = selected.includes('land')

    // Subset match (2026-08-15 user request): Verde+Blu must show mono-Verde,
    // mono-Blu, AND Verde-Blu cards — never a 3rd color — so "strict" means "no
    // colors outside the selection", not "exactly these colors". A single color
    // selected is just the one-element case of this same rule (still excludes
    // Verde-Blu when only Verde is picked).
    const colorSet: string[] = colors
    const matchesColors = colors.length > 0
      && card.colorIdentity.length > 0
      && card.colorIdentity.every(color => colorSet.includes(color))
    const matchesColorless = hasColorless && card.colorIdentity.length === 0

    // Terra combined with a color/Incolore narrows to that color of land (e.g.
    // Terra+Verde = green lands only); Terra alone still means any land — land
    // is the one bucket that ANDs with the rest instead of OR-ing in, since
    // "land AND green" is a meaningful, useful combination.
    if (hasLand) {
      if (colors.length === 0 && !hasColorless) return isLand
      return isLand && (matchesColors || matchesColorless)
    }

    // Without the Terra tab, Incolore stays land-exclusive (that's what Terra is
    // for) — same reasoning as the original single-select design.
    return (hasColorless && !isLand && card.colorIdentity.length === 0) || matchesColors
  }

  // Single source of truth for filtering, used by both UTable :data and GridView
  // :sections — there used to be two separate implementations (columnFilters via
  // TanStack for the table, manual predicates for the grid) that could drift apart:
  // it already happened with "Treatment" in the Cards view, where the facets came
  // out empty.
  const filteredCards = computed(() => data.value.filter((card) => {
    if (cardNameFilter.value
      && !card.cardName.toLowerCase().includes(cardNameFilter.value.toLowerCase())) return false
    if (statusFilter.value !== 'all' && card.status !== statusFilter.value) return false
    if (!cardMatchesColor(card, colorFilters.value)) return false
    if (onlyMine.value
      && currentAssociate.value
      && card.playerAssociateUuid !== currentAssociate.value.uuid) return false
    return true
  }))

  // Counts from the full unfiltered `data`, same convention as statusTabs below —
  // a filter tab shows how many cards exist in each bucket overall, not how many
  // survive the other active filters.
  const statusCounts = computed(() => {
    const counts: Record<WantedCardStatus, number> = { searching: 0, found: 0, abandoned: 0 }
    for (const card of data.value) {
      if (card.status in counts) counts[card.status]++
    }
    return counts
  })

  const statusTabs = computed<{ label: string, value: 'all' | WantedCardStatus, count?: number }[]>(() => [
    { label: t('wantedCard.filters.statusAll'), value: 'all', count: undefined },
    { label: t('wantedCard.status.searching'), value: 'searching', count: statusCounts.value.searching },
    { label: t('wantedCard.status.found'), value: 'found', count: statusCounts.value.found },
    { label: t('wantedCard.status.abandoned'), value: 'abandoned', count: statusCounts.value.abandoned }
  ])

  // manaCost feeds MagicManaCost (mana-font) directly — "land" has no real mana
  // symbol, {LAND} just maps to mana-font's own .ms-land icon (see ManaCost.vue,
  // it turns whatever sits between the braces into a lowercased CSS class).
  interface ColorTab {
    label: string
    value: WantedCardColorFilter
    manaCost?: string
  }

  const colorTabs: ColorTab[] = [
    { label: t('wantedCard.filters.colorAll'), value: 'all' },
    { label: t('wantedCard.filters.colorWhite'), value: 'W', manaCost: '{W}' },
    { label: t('wantedCard.filters.colorBlue'), value: 'U', manaCost: '{U}' },
    { label: t('wantedCard.filters.colorBlack'), value: 'B', manaCost: '{B}' },
    { label: t('wantedCard.filters.colorGreen'), value: 'G', manaCost: '{G}' },
    { label: t('wantedCard.filters.colorRed'), value: 'R', manaCost: '{R}' },
    { label: t('wantedCard.filters.colorColorless'), value: 'C', manaCost: '{C}' },
    { label: t('wantedCard.filters.colorLand'), value: 'land', manaCost: '{LAND}' }
  ]

  return {
    currentAssociate,
    cardNameFilter,
    statusFilter,
    colorFilters,
    toggleColorFilter,
    onlyMine,
    filteredCards,
    statusTabs,
    colorTabs
  }
}
