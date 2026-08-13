<!-- app\components\standings\PublicCittadinoPage.vue -->
<!--
  Public (no auth) counterpart to pages/(competitions)/standings/cittadino/
  index.vue, backing cittadino.pauperwave.org (settings/domains.vue). Same
  data composables and StandingsMatrixTable, but a plain header instead of
  UDashboardPanel/Navbar (both require the authenticated UDashboardGroup
  context from layouts/default.vue) — see PublicFormatPage.vue for the same
  reasoning applied to the other three rankings. The internal dashboard page
  is untouched.
-->
<script lang="ts" setup>
import type { TabsItem } from '@nuxt/ui'

const { t } = useI18n()

useSeoMeta({
  title: () => t('standings.tabTitle', { format: t('cittadino.breadcrumb') })
})

const selectedEdition = ref<string | null>(null)

const {
  edition, editions, events: allEvents, placements, loading, error
} = useCittadinoQuery(selectedEdition)

const {
  formats, selectedFormats, isFiltered, filteredEvents: events, standings
} = useCittadinoFilters(allEvents, placements)

const formatItems = computed(() => formats.value.map(format => ({
  type: 'checkbox' as const,
  label: format,
  checked: !isFiltered.value || selectedFormats.value.includes(format),
  onUpdateChecked(checked: boolean) {
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

const { columns, columnAccentColors } = useCittadinoTableColumns(events)

const tableMeta = {
  class: {
    tr: (row: { original: { position: number } }) =>
      row.original.position === CITTADINO_FINALISTS ? 'border-b-2 border-primary' : ''
  }
}

const legendCountedSample = CITTADINO_POINTS_BY_RANK[0]
const legendDroppedSample = CITTADINO_MIN_POINTS

const isInitialLoad = computed(() => loading.value && standings.value.length === 0)
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
      </div>

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
    </div>

    <UAlert
      color="warning"
      variant="subtle"
      icon="i-lucide-triangle-alert"
      class="shrink-0"
      :description="$t('common.mockDataNotice')"
    />

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
        :column-accent-colors="columnAccentColors"
      />
    </template>
  </div>
</template>
