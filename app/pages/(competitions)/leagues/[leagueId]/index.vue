<!-- app\pages\(competitions)\leagues\[leagueId]\index.vue -->
<script lang="ts" setup>
// First real (non-mock) detail page among tournaments/leagues/events singles
// (2026-08-16) — clicking a tournament card's league link lands here. Reuses
// TournamentsListGridView as-is: same cards, same edit/context-menu wiring
// as /tournaments, just pre-filtered to this league's tournaments. No bulk
// actions bar / table toggle here yet — this page is read+edit only for now.
const { t } = useI18n()
const route = useRoute()
const leagueUuid = computed(() => route.params.leagueId as string)

const { data: leaguesData, isLoading: leagueLoading } = useLeaguesQuery()
const league = computed(() =>
  leaguesData.value?.find(item => item.uuid === leagueUuid.value) ?? null)

useSeoMeta({ title: () => league.value?.name ?? t('league.breadcrumb') })

// Overrides the raw uuid path segment with the league's real name — see
// useBreadcrumbs.ts's own comment on why this can't be derived from the URL.
const { breadcrumbItems } = useBreadcrumbs(
  computed(() => (league.value ? { [leagueUuid.value]: league.value.name } : {}))
)

const {
  data: tournamentsData, isLoading: tournamentsLoading, status, refetch
} = useTournamentsQuery()
const tournaments = computed(() => (tournamentsData.value ?? [])
  .filter(tournament => tournament.leagueUuid === leagueUuid.value))

const loading = computed(() => leagueLoading.value || tournamentsLoading.value)

// Only rowContextMenuItems is needed here — tableContextMenuItems/
// onRowContextmenu are for the table view, which this league-scoped page
// doesn't have (grid only, at least for now).
const { rowContextMenuItems } = useCopyLinkContextMenu('/tournaments')
const { editingTournament, editModalOpen, openEditModal } = useTournamentsRowActions()
const selection = useSelection<number>()
</script>

<template>
  <UDashboardPanel id="league">
    <template #header>
      <UDashboardNavbar :title="league?.name ?? $t('league.detail.navbarTitle')">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #trailing>
          <USeparator orientation="vertical" class="h-4" />

          <QueryRefreshControl
            :is-loading="tournamentsLoading"
            :status="status"
            @refresh="refetch"
          />
        </template>

        <template #right>
          <NotificationsBellButton />
        </template>
      </UDashboardNavbar>

      <UDashboardToolbar>
        <template #left>
          <UBreadcrumb :items="breadcrumbItems" class="ms-2" />
        </template>
      </UDashboardToolbar>
    </template>

    <template #body>
      <div v-if="loading" class="flex items-center justify-center py-12">
        <UIcon name="i-lucide-loader-circle" class="animate-spin text-3xl text-muted" />
      </div>

      <TournamentsListGridView
        v-else
        :tournaments="tournaments"
        :context-menu-items="rowContextMenuItems"
        :on-edit="openEditModal"
        :selection="selection"
      />
    </template>
  </UDashboardPanel>

  <TournamentsListEditModal v-model="editModalOpen" :tournament="editingTournament" />
</template>
