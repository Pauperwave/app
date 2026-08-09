<!-- app\pages\(competitions)\standings\cittadino\index.vue -->
<script lang="ts" setup>
import type { TabsItem } from '@nuxt/ui'

// null, not '': the endpoint resolves a missing edition to the most recent one, so
// no year is hardcoded here, and a null sentinel cannot collide with a legitimate
// edition value the way an empty string could.
const selectedEdition = ref<string | null>(null)

const {
  edition, editions, events: allEvents, placements, loading, error
} = useCittadinoQuery(selectedEdition)

const {
  formats, selectedFormats, isFiltered, filteredEvents: events, standings
} = useCittadinoFilters(allEvents, placements)

// Checkbox items rather than a button group: five formats plus the colour swatch
// would crowd a toolbar that already carries the summary and the legend. Mirrors
// the "Mostra colonne" dropdown on /wanted-cards.
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
  editions.value.map(year => ({ label: year, value: year }))
)

const { columns } = useCittadinoTableColumns(events)

// A rule under the last qualifying row: the top-N cutoff is what most people read
// this table for, and a weight difference on the position number is too weak to
// find while scanning 46 rows.
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

// Only blank the table on the very first load. A tab switch refetches, and
// unmounting the whole matrix for it would make the page jump; UTable's own
// loading bar keeps the headers and the previous edition in place instead.
const isInitialLoad = computed(() => loading.value && standings.value.length === 0)
</script>

<template>
  <UDashboardPanel id="cittadino">
    <template #header>
      <UDashboardNavbar :title="$t('cittadino.breadcrumb')" :ui="{ right: 'gap-2' }">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <!-- Same treatment as the period tabs in NotificationsSlideover.vue. -->
          <UTabs
            v-model="activeEdition"
            :items="editionTabs"
            :content="false"
            color="neutral"
            size="md"
            :ui="BOXED_TABS_UI"
          />

          <USeparator orientation="vertical" class="h-4" />

          <NotificationsBellButton />
        </template>
      </UDashboardNavbar>

      <UDashboardToolbar :ui="{ root: 'flex-wrap h-auto py-2 gap-4', left: 'gap-4 flex-wrap' }">
        <template #left>
          <UDropdownMenu :items="formatItems" :content="{ align: 'start' }">
            <UButton
              :label="$t('cittadino.filters.formats')"
              color="neutral"
              :variant="isFiltered ? 'solid' : 'outline'"
              trailing-icon="i-lucide-list-filter"
            />
          </UDropdownMenu>

          <p class="text-sm text-muted">
            {{ $t('cittadino.summary', { players: standings.length, events: events.length }) }}
            <span v-if="isFiltered" class="text-warning">
              {{ $t('cittadino.filters.recomputed') }}
            </span>
          </p>
        </template>

        <template #right>
          <div class="flex items-center gap-4 text-xs text-muted">
            <span class="flex items-center gap-1.5">
              <span class="font-medium text-highlighted">{{ legendCountedSample }}</span>
              {{ $t('cittadino.legend.counted') }}
            </span>
            <span class="flex items-center gap-1.5">
              <span class="text-dimmed">({{ legendDroppedSample }})</span>
              {{ $t('cittadino.legend.dropped') }}
            </span>
            <span class="flex items-center gap-1.5">
              <span class="text-dimmed">·</span>
              {{ $t('cittadino.legend.absent') }}
            </span>
          </div>
        </template>
      </UDashboardToolbar>
    </template>

    <template #body>
      <UAlert
        v-if="error"
        color="error"
        variant="subtle"
        icon="i-lucide-circle-alert"
        :title="$t('cittadino.error.title')"
        :description="$t('cittadino.error.description')"
      >
        <template #actions>
          <UButton
            color="error"
            variant="outline"
            size="xs"
            @click="() => refreshNuxtData()"
          >
            {{ $t('common.retry') }}
          </UButton>
        </template>
      </UAlert>

      <div v-else-if="isInitialLoad" class="flex items-center justify-center py-12">
        <UIcon name="i-lucide-loader-circle" class="animate-spin text-3xl text-muted" />
      </div>

      <template v-else>
        <StandingsMatrixTable
          :data="standings"
          :columns="columns"
          :loading="loading"
          :meta="tableMeta"
        />
      </template>
    </template>
  </UDashboardPanel>
</template>
