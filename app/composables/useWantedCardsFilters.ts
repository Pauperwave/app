// app\composables\useWantedCardsFilters.ts
import type { Ref } from 'vue'
import type { WantedCard, WantedCardStatus } from '~/types'

export function useWantedCardsFilters(data: Ref<WantedCard[]>) {
  const { t } = useI18n()

  const currentAssociate = useCurrentAssociate()

  const cardNameFilter = ref('')
  // "Searching" by default — cards already found or abandoned stay hidden until
  // another tab is explicitly chosen.
  const statusFilter = ref<'all' | WantedCardStatus>('searching')
  // Single selection (not multiple): it allows showing the chosen language's icon
  // in the trigger through the `:icon` prop, which has no clean official pattern
  // with USelectMenu/UInputMenu `multiple`.
  const languageFilter = ref<string | undefined>(undefined)
  const treatmentFilter = ref<string[]>([])
  const onlyMine = ref(false)

  function toggleTreatmentFilter(value: string) {
    const index = treatmentFilter.value.indexOf(value)
    if (index === -1) treatmentFilter.value = [...treatmentFilter.value, value]
    else treatmentFilter.value = treatmentFilter.value.filter(item => item !== value)
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
    if (languageFilter.value !== undefined) {
      const wantedLanguage = languageFilter.value === 'any' ? '' : languageFilter.value
      if (card.language !== wantedLanguage) return false
    }
    if (treatmentFilter.value.length
      && !treatmentFilter.value.some(treatment => card.treatment.includes(treatment))) return false
    if (onlyMine.value
      && currentAssociate.value
      && card.playerAssociateUuid !== currentAssociate.value.uuid) return false
    return true
  }))

  // Distinct codes present in a column, sorted — the common basis for the
  // Language/Treatment filter items. Computed from `data` (unfiltered): otherwise
  // picking a language would make the other options vanish from the menu instead of
  // just filtering the rows on show.
  function getFacetedCodes(columnId: 'language' | 'treatment'): string[] {
    const codes = new Set<string>()
    for (const card of data.value) {
      if (columnId === 'language') codes.add(card.language)
      else card.treatment.forEach(treatment => codes.add(treatment))
    }
    return Array.from(codes).sort()
  }

  const languageFacetItems = computed<{ label: string, value: string, icon: string }[]>(() => {
    return getFacetedCodes('language').map((code: string) => ({
      // ComboboxItem (Reka UI, underneath USelectMenu/UInputMenu) does not accept
      // value="" — it is reserved to mean "no selection"/placeholder. The empty
      // language code ("Any") therefore uses the 'any' sentinel, translated back to
      // '' above before filtering.
      label: t(`wantedCard.languages.${code || 'any'}`),
      value: code || 'any',
      icon: WANTED_CARD_LANGUAGE_ICONS[code] ?? 'i-lucide-languages'
    }))
  })

  const selectedLanguage = computed(() =>
    languageFacetItems.value.find(item => item.value === languageFilter.value))

  const treatmentFacetItems = computed<{ label: string, value: string }[]>(() => {
    return getFacetedCodes('treatment').map((code: string) => ({
      label: t(`wantedCard.treatments.${code}`),
      value: code
    }))
  })

  const statusTabs = computed<{ label: string, value: 'all' | WantedCardStatus }[]>(() => [
    { label: t('wantedCard.filters.statusAll'), value: 'all' },
    { label: t('wantedCard.status.searching'), value: 'searching' },
    { label: t('wantedCard.status.found'), value: 'found' },
    { label: t('wantedCard.status.abandoned'), value: 'abandoned' }
  ])

  return {
    currentAssociate,
    cardNameFilter,
    statusFilter,
    languageFilter,
    treatmentFilter,
    onlyMine,
    toggleTreatmentFilter,
    filteredCards,
    languageFacetItems,
    selectedLanguage,
    treatmentFacetItems,
    statusTabs
  }
}
