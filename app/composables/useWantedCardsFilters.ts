// app\composables\useWantedCardsFilters.ts
import type { Ref } from 'vue'
import type { WantedCard, WantedCardStatus } from '~/types'

export function useWantedCardsFilters(data: Ref<WantedCard[]>) {
  const { t } = useI18n()

  const currentAssociate = useCurrentAssociate()

  const cardNameFilter = ref('')
  // "In cerca" di default — le carte già trovate/abbandonate restano
  // nascoste finché non si sceglie esplicitamente un'altra tab.
  const statusFilter = ref<'all' | WantedCardStatus>('searching')
  // Singola selezione (non multipla): permette di mostrare l'icona della
  // lingua scelta nel trigger tramite la prop `:icon`, cosa che con
  // USelectMenu/UInputMenu `multiple` non ha un pattern ufficiale pulito.
  const languageFilter = ref<string | undefined>(undefined)
  const treatmentFilter = ref<string[]>([])
  const onlyMine = ref(false)

  function toggleTreatmentFilter(value: string) {
    const index = treatmentFilter.value.indexOf(value)
    if (index === -1) treatmentFilter.value = [...treatmentFilter.value, value]
    else treatmentFilter.value = treatmentFilter.value.filter(item => item !== value)
  }

  // Unica fonte di verità per il filtro, usata sia da UTable :data che da
  // GridView :sections — prima esistevano due implementazioni separate
  // (columnFilters via TanStack per la tabella, predicati manuali per la
  // griglia) che potevano disallinearsi: è già successo con "Trattamento"
  // in vista Cards, dove i facet risultavano vuoti.
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

  // Codici distinti presenti in una colonna, ordinati — base comune per gli
  // item dei filtri Lingua/Trattamento. Calcolato da `data` (non filtrato):
  // altrimenti selezionare una lingua farebbe sparire le altre opzioni dal
  // menu invece di limitarsi a filtrare le righe mostrate.
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
      // ComboboxItem (Reka UI, sotto USelectMenu/UInputMenu) non accetta
      // value="" — è riservato per rappresentare "nessuna selezione"/
      // placeholder. Il codice lingua vuoto ("Indifferente") usa quindi il
      // sentinel 'any', tradotto di nuovo in '' sopra prima di filtrare.
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
