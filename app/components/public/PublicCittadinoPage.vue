<!-- app\components\public\PublicCittadinoPage.vue -->
<!--
  Public (no auth) counterpart to pages/(competitions)/standings/cittadino/
  index.vue, backing cittadino.pauperwave.org (settings/domains.vue). Same
  data composables and PublicMatrixTable, but a plain header instead of
  UDashboardPanel/Navbar (both require the authenticated UDashboardGroup
  context from layouts/default.vue) — see PublicFormatPage.vue for the same
  reasoning applied to the other three rankings. The internal dashboard page
  is untouched.
-->
<script lang="ts" setup>
const {
  formatItems, isFiltered, activeEdition, editionTabs, events, standings,
  columns, columnAccentColors, tableMeta, legendCountedSample, legendDroppedSample,
  isInitialLoad, loading, error
} = useCittadinoStandingsPage()
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
      <CittadinoFiltersDropdown
        :format-items="formatItems"
        :is-filtered="isFiltered"
        :player-count="standings.length"
        :event-count="events.length"
      />

      <StandingsLegend :items="[
        { sample: legendCountedSample, labelKey: 'cittadino.legend.counted' },
        { sample: `(${legendDroppedSample})`, labelKey: 'cittadino.legend.dropped', dimmed: true },
        { sample: '·', labelKey: 'cittadino.legend.absent', dimmed: true }
      ]" />
    </div>

    <CittadinoStandingsBody
      :error="error"
      :is-initial-load="isInitialLoad"
      :standings="standings"
      :columns="columns"
      :loading="loading"
      :table-meta="tableMeta"
      :column-accent-colors="columnAccentColors"
    />
  </div>
</template>
