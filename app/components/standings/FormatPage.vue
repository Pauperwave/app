<!-- app\components\standings\FormatPage.vue -->
<!-- Moved back out of components/public/ (2026-08-15) to fix a component-name
     collision: components/public/PublicFormatPage.vue and a since-moved
     components/public/FormatPage.vue both resolved to the auto-import name
     PublicFormatPage (NUXT_B3011). This is the internal/authenticated
     variant — see PublicFormatPage.vue's own header for the split. -->
<script lang="ts" setup>
import type { StandingsFormat } from '~/composables/standings/useFormatStandingsQuery'

interface Props {
  format: StandingsFormat
}

const { format } = defineProps<Props>()

const { t } = useI18n()
useSeoMeta({ title: () => t(FORMAT_STANDINGS_BREADCRUMB_KEYS[format]) })

// Panel id and breadcrumb i18n key both derive from `format` — the three
// /standings/<format> pages (commander, pauper, premodern) were byte-identical
// aside from these two strings and the `format` passed to
// useFormatStandingsQuery, so this replaces all three page bodies.
// /standings/cittadino is NOT one of these: it has its own edition-picker logic
// and isn't just a format variant of this page.
// Own local search state, not part of the shared composable — PublicFormatPage.vue
// has its own equivalent ref rather than sharing this one (both pages call
// useFormatStandingsPage independently). Declared before that call below
// since it threads through to useFormatStandingsTableColumns.ts for match
// highlighting.
// fallow-ignore-next-line code-duplication -- see the same comment in PublicFormatPage.vue
const search = ref('')

const {
  activeLeague, leagueTabs, events, standings, columns, participationPoints,
  isInitialLoad, tableMeta, loading
} = useFormatStandingsPage(format, search)

const filteredStandings = computed(() => filterStandingsBySearch(standings.value, search.value))

// Same convention as associates/requests.vue's tesseramentoLink: point at
// this deploy's own /classifiche/<format> for now, until each subdomain is
// wired up in DNS (settings/domains.vue).
const publicUrl = computed(() => `${useRequestURL().origin}/classifiche/${format}`)

const tour = useStandingsFormatTour()
</script>

<template>
  <UDashboardPanel :id="`standings-${format}`">
    <template #header>
      <UDashboardNavbar
        :title="$t(FORMAT_STANDINGS_BREADCRUMB_KEYS[format])"
        :ui="{ right: 'gap-2' }"
      >
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <TourStartButton :label="$t('standings.tour.startButton')" @start="tour.start()" />

          <USeparator orientation="vertical" class="h-4" />

          <!-- Same treatment as the period tabs in NotificationsSlideover.vue and
               the edition tabs on /standings/cittadino. -->
          <div id="tour-standings-league-tabs">
            <UTabs
              v-model="activeLeague"
              :items="leagueTabs"
              :content="false"
              color="neutral"
              size="md"
              :ui="BOXED_TABS_UI"
            />
          </div>

          <USeparator orientation="vertical" class="h-4" />

          <!-- Same copy/open-link pair as associates/requests.vue's tesseramento
               link — points at this format's public standing page
               (/classifiche/<format>, see PublicFormatPage.vue), not this
               internal dashboard route. -->
          <div id="tour-standings-public-link">
            <CopyOpenLinkPair
              :url="publicUrl"
              :copy-label="$t('standings.copyPublicLink')"
              :open-label="$t('standings.openPublicLink')"
            />
          </div>

          <USeparator orientation="vertical" class="h-4" />

          <NotificationsBellButton />
        </template>
      </UDashboardNavbar>

      <UDashboardToolbar>
        <!-- fallow-ignore-next-line code-duplication -- see PublicFormatPage.vue -->
        <template #left>
          <div class="flex items-center gap-4 flex-wrap">
            <p class="text-sm text-muted">
              {{ $t('standings.summary', { players: standings.length, events: events.length }) }}
            </p>

            <SearchInput
              v-model="search"
              class="w-56 sm:w-64 lg:w-72"
              :placeholder="$t('standings.searchPlaceholder')"
            />
          </div>
        </template>

        <template #right>
          <StandingsLegend
            :items="[
              { sample: FORMAT_STANDINGS_MAX_POINTS, labelKey: 'standings.legend.counted' },
              {
                sample: `(${FORMAT_STANDINGS_MIN_POINTS})`,
                labelKey: 'standings.legend.dropped',
                dimmed: true
              },
              { sample: '·', labelKey: 'standings.legend.absent', dimmed: true },
              {
                sample: `+${participationPoints}`,
                labelKey: 'standings.legend.participation',
                dimmed: true
              }
            ]"
          />
        </template>
      </UDashboardToolbar>
    </template>

    <template #body>
      <div id="tour-standings-content">
        <StandingsFormatBody
          :is-initial-load="isInitialLoad"
          :standings="filteredStandings"
          :columns="columns"
          :loading="loading"
          :table-meta="tableMeta"
        />
      </div>
    </template>
  </UDashboardPanel>

  <TourGuide :tour="tour" />
</template>
