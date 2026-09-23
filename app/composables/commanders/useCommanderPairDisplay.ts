// app\composables\commanders\useCommanderPairDisplay.ts
// Catalog art + display name for a (possibly partnered) commander pair —
// shared by statistics/decks/[deckSlug].vue and players/.../deck/
// [deckSlug].vue, which independently duplicated this exact resolution
// (fallow:dupes, 2026-09-23).
export function useCommanderPairDisplay(
  commander1Name: Ref<string | null> | ComputedRef<string | null>,
  commander2Name: Ref<string | null> | ComputedRef<string | null>
) {
  const { t } = useI18n()

  const { commander1Data, commander2Data, loading: catalogLoading } = useCommanderCards(
    commander1Name, commander2Name
  )
  const art1 = computed(() => getArtCrop(commander1Data.value))
  const art2 = computed(() => getArtCrop(commander2Data.value))

  const commanderDisplayName = computed(() => [commander1Name.value, commander2Name.value]
    .filter(Boolean).join(' / ') || t('deck.fallbackName'))

  return { commander1Data, commander2Data, catalogLoading, art1, art2, commanderDisplayName }
}
