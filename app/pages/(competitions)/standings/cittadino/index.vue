<!-- app\pages\(competitions)\standings\cittadino\index.vue -->
<script lang="ts" setup>
const { t } = useI18n()

useSeoMeta({ title: () => t('cittadino.breadcrumb') })

// Own local search state, not part of the shared composable — PublicCittadinoPage.vue
// has its own equivalent ref rather than sharing this one (both pages call
// useCittadinoStandingsPage independently). Declared before that call below
// since it threads through to useCittadinoTableColumns.ts for match
// highlighting.
const search = ref('')

const {
  formatItems, isFiltered, activeEdition, editionTabs, events, standings,
  columns, columnAccentColors, tableMeta, legendCountedSample, legendDroppedSample,
  isInitialLoad, loading, error
} = useCittadinoStandingsPage(search)

const filteredStandings = computed(() => {
  const query = search.value.trim().toLowerCase()
  if (!query) return standings.value
  return standings.value.filter(row => row.playerName.toLowerCase().includes(query))
})

// Same convention as associates/requests.vue's tesseramentoLink: point at
// this deploy's own /rankings/cittadino for now, until the subdomain is
// wired up in DNS (settings/domains.vue).
const publicUrl = computed(() => `${useRequestURL().origin}/rankings/cittadino`)

const tour = useCittadinoTour()
</script>

<template>
  <UDashboardPanel id="cittadino">
    <template #header>
      <UDashboardNavbar :title="$t('cittadino.breadcrumb')" :ui="{ right: 'gap-2' }">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <UButton
            :label="$t('cittadino.tour.startButton')"
            icon="i-lucide-circle-help"
            color="neutral"
            variant="ghost"
            @click="tour.start()"
          />

          <USeparator orientation="vertical" class="h-4" />

          <!-- Same treatment as the period tabs in NotificationsSlideover.vue. -->
          <div id="tour-cittadino-edition-tabs">
            <UTabs
              v-model="activeEdition"
              :items="editionTabs"
              :content="false"
              color="neutral"
              size="md"
              :ui="BOXED_TABS_UI"
            />
          </div>

          <USeparator orientation="vertical" class="h-4" />

          <!-- Same copy/open-link pair as associates/requests.vue's
               tesseramento link — points at the public standings page
               (/rankings/cittadino, see PublicCittadinoPage.vue), not this
               internal dashboard route. -->
          <div id="tour-cittadino-public-link">
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

      <UDashboardToolbar :ui="{ root: 'flex-wrap h-auto py-2 gap-4', left: 'gap-4 flex-wrap' }">
        <template #left>
          <div id="tour-cittadino-filters" class="flex items-center gap-4 flex-wrap">
            <CittadinoFiltersDropdown
              :format-items="formatItems"
              :is-filtered="isFiltered"
              :player-count="standings.length"
              :event-count="events.length"
            />

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
              { sample: legendCountedSample, labelKey: 'cittadino.legend.counted' },
              {
                sample: `(${legendDroppedSample})`,
                labelKey: 'cittadino.legend.dropped',
                dimmed: true
              },
              { sample: '·', labelKey: 'cittadino.legend.absent', dimmed: true }
            ]"
          />
        </template>
      </UDashboardToolbar>
    </template>

    <template #body>
      <div id="tour-cittadino-content">
        <CittadinoStandingsBody
          :error="error"
          :is-initial-load="isInitialLoad"
          :standings="filteredStandings"
          :columns="columns"
          :loading="loading"
          :table-meta="tableMeta"
          :column-accent-colors="columnAccentColors"
        />
      </div>
    </template>
  </UDashboardPanel>

  <TourGuide :tour="tour" />
</template>
