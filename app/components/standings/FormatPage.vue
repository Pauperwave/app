<!-- app\components\standings\FormatPage.vue -->
<!-- Moved back out of components/public/ (2026-08-15) to fix a component-name
     collision: components/public/PublicFormatPage.vue and a since-moved
     components/public/FormatPage.vue both resolved to the auto-import name
     PublicFormatPage (NUXT_B3011). This is the internal/authenticated
     variant — see PublicFormatPage.vue's own header for the split. -->
<script lang="ts" setup>
import type { TabsItem } from '@nuxt/ui'
import type { StandingsFormat } from '~/composables/standings/useFormatStandingsQuery'

interface Props {
  format: StandingsFormat
}

const { format } = defineProps<Props>()

const { t } = useI18n()

// Panel id and breadcrumb i18n key both derive from `format` — the three
// /standings/<format> pages (commander, pauper, premodern) were byte-identical
// aside from these two strings and the `format` passed to
// useFormatStandingsQuery, so this replaces all three page bodies.
// /standings/cittadino is NOT one of these: it has its own edition-picker logic
// and isn't just a format variant of this page.
const breadcrumbKeys: Record<StandingsFormat, string> = {
  commander: 'standings.commanderBreadcrumb',
  pauper: 'standings.pauperBreadcrumb',
  premodern: 'standings.premodernBreadcrumb'
}

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
  leagues.value.map(item => ({ label: item.name, value: item.uuid }))
)

const { columns } = useFormatStandingsTableColumns(events, topCutoff)

useSeoMeta({
  title: () => t('standings.tabTitle', { format: t(breadcrumbKeys[format]) })
})

// Same convention as associates/requests.vue's tesseramentoLink: point at
// this deploy's own /rankings/<format> for now, until each subdomain is
// wired up in DNS (settings/domains.vue).
const publicUrl = computed(() => `${useRequestURL().origin}/rankings/${format}`)

const isInitialLoad = computed(() => loading.value && standings.value.length === 0)

const tour = useStandingsFormatTour()

// A rule under the top-cutoff row, same treatment as the Cittadino finalist line.
const tableMeta = {
  class: {
    tr: (row: { original: { position: number } }) =>
      row.original.position === topCutoff.value ? 'border-b-2 border-primary' : ''
  }
}
</script>

<template>
  <UDashboardPanel :id="`standings-${format}`">
    <template #header>
      <UDashboardNavbar :title="$t(breadcrumbKeys[format])" :ui="{ right: 'gap-2' }">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <UButton
            :label="$t('standings.tour.startButton')"
            icon="i-lucide-circle-help"
            color="neutral"
            variant="ghost"
            @click="tour.start()"
          />

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
               (/rankings/<format>, see PublicFormatPage.vue), not this
               internal dashboard route. -->
          <div id="tour-standings-public-link" class="flex items-center gap-2">
            <CopyLinkButton :url="publicUrl" :label="$t('standings.copyPublicLink')" />
            <UTooltip :text="$t('standings.openPublicLink')">
              <UButton
                :to="publicUrl"
                target="_blank"
                :icon="ICONS.externalLink"
                :aria-label="$t('standings.openPublicLink')"
                color="neutral"
                variant="outline"
                square
              />
            </UTooltip>
          </div>

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
            <span class="flex items-center gap-1.5">
              <span class="text-dimmed">+{{ participationPoints }}</span>
              {{ $t('standings.legend.participation') }}
            </span>
          </div>
        </template>
      </UDashboardToolbar>
    </template>

    <template #body>
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

      <div v-else id="tour-standings-content">
        <PublicMatrixTable
          :data="standings"
          :columns="columns"
          :loading="loading"
          :meta="tableMeta"
        />
      </div>
    </template>
  </UDashboardPanel>

  <TourGuide :tour="tour" />
</template>
