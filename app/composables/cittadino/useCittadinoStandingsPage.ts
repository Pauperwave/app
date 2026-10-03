// app\composables\cittadino\useCittadinoStandingsPage.ts
// Shared by standings/cittadino/index.vue (internal) and components/public/PublicCittadinoPage.vue
// (public, cittadino.pauperwave.org): the same data/filters/columns/legend; only the surrounding
// chrome (UDashboardPanel vs plain header) and the internal-only publicUrl/tour extras differ
import type { TabsItem } from '@nuxt/ui'

export function useCittadinoStandingsPage(search?: Ref<string>) {
  const { t } = useI18n()

  useSeoMeta({
    title: () => t('standings.tabTitle', { format: t('cittadino.breadcrumb') })
  })

  // null, not '': the endpoint resolves a missing edition to the latest, so no year is hardcoded,
  // and null can't collide with a real edition like '' could
  const selectedEdition = ref<string | null>(null)

  const {
    edition, editions, events: allEvents, placements, loading, error
  } = useCittadinoQuery(selectedEdition)

  const {
    formats, selectedFormats, isFiltered, filteredEvents: events, standings
  } = useCittadinoFilters(allEvents, placements)

  // Checkbox items rather than a button group: five formats plus the color swatch would crowd a
  // toolbar already carrying summary and legend (like "Mostra colonne" on /wanted-cards)
  const formatItems = computed(() => formats.value.map(format => ({
    type: 'checkbox' as const,
    label: format,
    checked: !isFiltered.value || selectedFormats.value.includes(format),
    onUpdateChecked(checked: boolean) {
      // First interaction starts from "everything selected", so unchecking one
      // format leaves the other four rather than clearing the board.
      const current = isFiltered.value ? selectedFormats.value : [...formats.value]
      selectedFormats.value = checked
        ? [...new Set([...current, format])]
        : current.filter(value => value !== format)
    },
    onSelect(event: Event) {
      event.preventDefault()
    }
  })))

  const activeEdition = computed({
    get: () => selectedEdition.value ?? edition.value,
    set: (value: string) => {
      selectedEdition.value = value
    }
  })

  const editionTabs = computed<TabsItem[]>(() =>
    editions.value.map(year => ({ label: year, value: year })))

  const { columns, columnAccentColors } = useCittadinoTableColumns(events, search)

  // A rule under the last qualifying row: the top-N cutoff is what most readers look for, and a
  // bolder position number is too weak to spot among 46 rows
  const tableMeta = {
    class: {
      tr: (row: { original: { position: number } }) =>
        row.original.position === CITTADINO_FINALISTS ? 'border-b-2 border-primary' : ''
    }
  }

  // Legend samples come from the scoring table itself, so they cannot drift from
  // what the cells actually render.
  const legendCountedSample = CITTADINO_POINTS_BY_RANK[0]
  const legendDroppedSample = CITTADINO_MIN_POINTS

  // Only blank the table on the very first load: a tab switch refetches, and unmounting the matrix
  // would make the page jump (UTable's loading bar keeps headers and the previous edition)
  const isInitialLoad = computed(() => loading.value && standings.value.length === 0)

  return {
    formatItems,
    isFiltered,
    activeEdition,
    editionTabs,
    events,
    standings,
    columns,
    columnAccentColors,
    tableMeta,
    legendCountedSample,
    legendDroppedSample,
    isInitialLoad,
    loading,
    error
  }
}
