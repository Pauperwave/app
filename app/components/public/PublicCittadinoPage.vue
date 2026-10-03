<!-- app\components\public\PublicCittadinoPage.vue -->
<!-- Public (no auth) counterpart to pages/(competitions)/standings/cittadino/index.vue, backing
     cittadino.pauperwave.org (settings/domains.vue): the same data composables and
     PublicMatrixTable, but a plain header instead of UDashboardPanel/Navbar (both need the
     authenticated UDashboardGroup context from layouts/default.vue), as in
     PublicFormatPage.vue. -->
<script lang="ts" setup>
// Declared before the useCittadinoStandingsPage call since it threads through to
// useCittadinoTableColumns.ts for match highlighting: the search the internal
// standings/cittadino/index.vue has, extended to public visitors (who are more likely to scan for
// their own name) fallow-ignore-next-line code-duplication -- mirrors
// standings/cittadino/index.vue's own shell wiring around useCittadinoStandingsPage
const search = ref('')

const {
  formatItems, isFiltered, activeEdition, editionTabs, events, standings,
  columns, columnAccentColors, tableMeta, legendCountedSample, legendDroppedSample,
  isInitialLoad, loading, error
} = useCittadinoStandingsPage(search)

const filteredStandings = computed(() => filterStandingsBySearch(standings.value, search.value))
</script>

<template>
  <div class="flex-1 flex flex-col gap-4 px-6 py-8 md:px-10">
    <div class="flex items-center justify-between gap-4 flex-wrap">
      <h1 class="text-xl font-semibold">
        {{ $t('cittadino.breadcrumb') }}
      </h1>
      <UTabs
        v-model="activeEdition"
        :items="editionTabs"
        :content="false"
        color="neutral"
        size="md"
        :ui="BOXED_TABS_UI"
      />
    </div>

    <div class="flex items-center justify-between gap-4 flex-wrap">
      <div class="flex items-center gap-4 flex-wrap">
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

      <StandingsLegend :items="[
        { sample: legendCountedSample, labelKey: 'cittadino.legend.counted' },
        { sample: `(${legendDroppedSample})`, labelKey: 'cittadino.legend.dropped', dimmed: true },
        { sample: '·', labelKey: 'cittadino.legend.absent', dimmed: true }
      ]" />
    </div>

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
