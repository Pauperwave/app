<!-- app\pages\(competitions)\standings\pauper\index.vue -->
<script lang="ts" setup>
import type { TabsItem } from '@nuxt/ui'

// null, not '': the endpoint resolves a missing/unknown league to the current
// one, so no uuid is hardcoded here — same pattern as Cittadino's selectedEdition.
const selectedLeague = ref<string | null>(null)

const {
  league, leagues, topCutoff, events, standings, loading
} = useFormatStandingsQuery('pauper', selectedLeague)

const activeLeague = computed({
  get: () => selectedLeague.value ?? league.value,
  set: (value: string) => {
    selectedLeague.value = value
  }
})

const leagueTabs = computed<TabsItem[]>(() =>
  leagues.value.map(item => ({ label: item.name, value: item.uuid }))
)

const { columns } = useFormatStandingsTableColumns(events, topCutoff)

const isInitialLoad = computed(() => loading.value && standings.value.length === 0)

// A rule under the top-cutoff row, same treatment as the Cittadino finalist line.
const tableMeta = {
  class: {
    tr: (row: { original: { position: number } }) =>
      row.original.position === topCutoff.value ? 'border-b-2 border-primary' : ''
  }
}
</script>

<template>
  <UDashboardPanel id="standings-pauper">
    <template #header>
      <UDashboardNavbar :title="$t('standings.pauperBreadcrumb')" :ui="{ right: 'gap-2' }">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <!-- Same treatment as the period tabs in NotificationsSlideover.vue and
               the edition tabs on /standings/cittadino. -->
          <UTabs
            v-model="activeLeague"
            :items="leagueTabs"
            :content="false"
            color="neutral"
            size="md"
            :ui="BOXED_TABS_UI"
          />

          <USeparator orientation="vertical" class="h-4" />

          <NotificationsBellButton />
        </template>
      </UDashboardNavbar>

      <UDashboardToolbar>
        <template #left>
          <p class="text-sm text-muted">
            {{ $t('standings.summary', { players: standings.length, events: events.length }) }}
          </p>
        </template>

        <template #right>
          <div class="flex items-center gap-4 text-xs text-muted">
            <span class="flex items-center gap-1.5">
              <span class="font-medium text-highlighted">{{ FORMAT_STANDINGS_MAX_POINTS }}</span>
              {{ $t('standings.legend.counted') }}
            </span>
            <span class="flex items-center gap-1.5">
              <span class="text-dimmed">({{ FORMAT_STANDINGS_MIN_POINTS }})</span>
              {{ $t('standings.legend.dropped') }}
            </span>
            <span class="flex items-center gap-1.5">
              <span class="text-dimmed">·</span>
              {{ $t('standings.legend.absent') }}
            </span>
          </div>
        </template>
      </UDashboardToolbar>
    </template>

    <template #body>
      <div v-if="isInitialLoad" class="flex items-center justify-center py-12">
        <UIcon name="i-lucide-loader-circle" class="animate-spin text-3xl text-muted" />
      </div>

      <StandingsMatrixTable
        v-else
        :data="standings"
        :columns="columns"
        :loading="loading"
        :meta="tableMeta"
      />
    </template>
  </UDashboardPanel>
</template>
