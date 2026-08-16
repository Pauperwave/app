<!-- app\components\public\PublicFormatPage.vue -->
<!--
  Public (no auth) counterpart to FormatPage.vue, backing the
  commander/premodern/pauper.pauperwave.org subdomains (settings/domains.vue).
  Same data composables and PublicMatrixTable, but a plain header instead
  of UDashboardPanel/Navbar (both require the authenticated UDashboardGroup
  context from layouts/default.vue) and no NotificationsBellButton (personal,
  needs auth) or UDashboardSidebarCollapse (no sidebar exists on a public
  page). FormatPage.vue itself is untouched — it still backs the internal
  /standings/<format> dashboard routes used by logged-in staff.
-->
<script lang="ts" setup>
import type { StandingsFormat } from '~/composables/standings/useFormatStandingsQuery'

interface Props {
  format: StandingsFormat
}

const { format } = defineProps<Props>()

const {
  activeLeague, leagueTabs, events, standings, columns, participationPoints,
  isInitialLoad, tableMeta, loading
} = useFormatStandingsPage(format)
</script>

<template>
  <div class="flex-1 flex flex-col gap-4 px-6 py-8 md:px-10">
    <div class="flex items-center justify-between gap-4 flex-wrap">
      <h1 class="text-xl font-semibold">
        {{ $t(FORMAT_STANDINGS_BREADCRUMB_KEYS[format]) }}
      </h1>
      <UTabs
        v-model="activeLeague"
        :items="leagueTabs"
        :content="false"
        color="neutral"
        size="md"
        :ui="BOXED_TABS_UI"
      />
    </div>

    <div class="flex items-center justify-between gap-4 flex-wrap">
      <p class="text-sm text-muted">
        {{ $t('standings.summary', { players: standings.length, events: events.length }) }}
      </p>

      <StandingsLegend :items="[
        { sample: FORMAT_STANDINGS_MAX_POINTS, labelKey: 'standings.legend.counted' },
        { sample: `(${FORMAT_STANDINGS_MIN_POINTS})`, labelKey: 'standings.legend.dropped', dimmed: true },
        { sample: '·', labelKey: 'standings.legend.absent', dimmed: true },
        { sample: `+${participationPoints}`, labelKey: 'standings.legend.participation', dimmed: true }
      ]" />
    </div>

    <StandingsFormatBody
      :is-initial-load="isInitialLoad"
      :standings="standings"
      :columns="columns"
      :loading="loading"
      :table-meta="tableMeta"
    />
  </div>
</template>
