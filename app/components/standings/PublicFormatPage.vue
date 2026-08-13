<!-- app\components\standings\PublicFormatPage.vue -->
<!--
  Public (no auth) counterpart to FormatPage.vue, backing the
  commander/premodern/pauper.pauperwave.org subdomains (settings/domains.vue).
  Same data composables and StandingsMatrixTable, but a plain header instead
  of UDashboardPanel/Navbar (both require the authenticated UDashboardGroup
  context from layouts/default.vue) and no NotificationsBellButton (personal,
  needs auth) or UDashboardSidebarCollapse (no sidebar exists on a public
  page). FormatPage.vue itself is untouched — it still backs the internal
  /standings/<format> dashboard routes used by logged-in staff.
-->
<script lang="ts" setup>
import type { TabsItem } from '@nuxt/ui'
import type { StandingsFormat } from '~/composables/standings/useFormatStandingsQuery'

interface Props {
  format: StandingsFormat
}

const { format } = defineProps<Props>()

const { t } = useI18n()

const breadcrumbKeys: Record<StandingsFormat, string> = {
  commander: 'standings.commanderBreadcrumb',
  pauper: 'standings.pauperBreadcrumb',
  premodern: 'standings.premodernBreadcrumb'
}

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

const { columns } = useFormatStandingsTableColumns(events, topCutoff)

useSeoMeta({
  title: () => t('standings.tabTitle', { format: t(breadcrumbKeys[format]) })
})

const isInitialLoad = computed(() => loading.value && standings.value.length === 0)

const tableMeta = {
  class: {
    tr: (row: { original: { position: number } }) =>
      row.original.position === topCutoff.value ? 'border-b-2 border-primary' : ''
  }
}
</script>

<template>
  <div class="flex-1 flex flex-col gap-4 px-6 py-8 md:px-10">
    <div class="flex items-center justify-between gap-4 flex-wrap">
      <h1 class="text-xl font-semibold">
        {{ $t(breadcrumbKeys[format]) }}
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
        <span class="flex items-center gap-1.5">
          <span class="text-dimmed">+{{ participationPoints }}</span>
          {{ $t('standings.legend.participation') }}
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
  </div>
</template>
