// app\composables\standings\useFormatStandingsPage.ts
// Shared by components/standings/FormatPage.vue (internal, authenticated)
// and components/public/PublicFormatPage.vue (public, backing
// <format>.pauperwave.org) — same data/columns/legend, only the surrounding
// chrome (UDashboardPanel vs. plain header) and the internal-only
// publicUrl/tour extras differ (fallow:dupes flagged the whole script block
// as a near-identical 49-line clone).
import type { TabsItem } from '@nuxt/ui'
import type { StandingsFormat } from './useFormatStandingsQuery'

export const FORMAT_STANDINGS_BREADCRUMB_KEYS: Record<StandingsFormat, string> = {
  commander: 'standings.commanderBreadcrumb',
  pauper: 'standings.pauperBreadcrumb',
  premodern: 'standings.premodernBreadcrumb'
}

export function useFormatStandingsPage(format: StandingsFormat, search?: Ref<string>) {
  const { t } = useI18n()

  // null, not '': the endpoint resolves a missing/unknown league to the current
  // one, so no uuid is hardcoded here — same pattern as Cittadino's selectedEdition.
  const selectedLeague = ref<string | null>(null)

  const {
    league, leagues, topCutoff, participationPoints, events, standings, loading
  } = useFormatStandingsQuery(format, selectedLeague)

  const activeLeague = computed({
    get: () => selectedLeague.value ?? league.value,
    set: (value: string) => {
      selectedLeague.value = value
    }
  })

  const leagueTabs = computed<TabsItem[]>(() =>
    leagues.value.map(item => ({ label: item.name, value: item.uuid })))

  const { columns } = useFormatStandingsTableColumns(events, topCutoff, search)

  useSeoMeta({
    title: () => t('standings.tabTitle', { format: t(FORMAT_STANDINGS_BREADCRUMB_KEYS[format]) })
  })

  const isInitialLoad = computed(() => loading.value && standings.value.length === 0)

  // A rule under the top-cutoff row, same treatment as the Cittadino finalist line.
  const tableMeta = {
    class: {
      tr: (row: { original: { position: number } }) =>
        row.original.position === topCutoff.value ? 'border-b-2 border-primary' : ''
    }
  }

  return {
    activeLeague,
    leagueTabs,
    events,
    standings,
    columns,
    participationPoints,
    isInitialLoad,
    tableMeta,
    loading
  }
}
