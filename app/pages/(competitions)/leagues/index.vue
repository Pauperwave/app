<!-- app\pages\(competitions)\leagues\index.vue -->
<script lang="ts" setup>
// fallow-ignore-file code-duplication -- mirrors events/index.vue and
// tournaments/index.vue's mock-driven layout on purpose; expected to diverge
// once real Supabase tables land
import { add } from 'date-fns'
import type { DropdownMenuItem, TabsItem } from '@nuxt/ui'
import type { League, Range } from '~/types'

const { isModalOpen } = useModalOpenFromQuery()

// Not wired to a filter yet: leagues have no per-item date to filter by (only
// tournaments do). Kept here for visual/toolbar consistency with the
// tournaments page — defaults to "Prossimo anno" (matches DateRangePicker's
// own next-year preset, 2026-08-23 — was "Tutto").
const range = shallowRef<Range>({
  start: new Date(),
  end: add(new Date(), { years: 1 })
})

const { t } = useI18n()

useSeoMeta({ title: () => t('league.breadcrumb') })

const {
  data: leaguesData, isLoading: loading, isPending, status, refetch
} = useLeaguesQuery()
const data = computed(() => leaguesData.value ?? [])
// Single search box matching league name — same "next to the title, before
// the refresh control" navbar placement as transactions/index.vue's own
// search box (user request, 2026-08-30).
const search = ref('')

const { statusFilter, filteredLeagues, statusTabs } = useLeaguesFilters(data, search)

// undefined (ListSkeleton's/GridView's own default count) only on a genuine
// first load — same isPending-vs-isLoading reasoning as tournaments/index.vue.
const skeletonCount = computed(() => (isPending.value ? undefined : filteredLeagues.value.length))
const {
  rowContextMenuItems, onRowContextmenu, contextMenuRow
} = useCopyLinkContextMenu<League>('/leagues')
const { editingLeague, editModalOpen, openEditModal } = useLeaguesRowActions()

// "Copia lega" (user request, 2026-08-29) — same reusable-instance
// convention as tournaments/index.vue's own copy action.
const copyModalOpen = ref(false)
const copySourceLeague = shallowRef<League | null>(null)
function openCopyModal(league: League) {
  copySourceLeague.value = league
  copyModalOpen.value = true
}

const selection = useSelection<number>()
const { columns } = useLeaguesTableColumns(selection, openEditModal)
const {
  pendingAction, confirmOpen: bulkConfirmOpen, requestStatusChange, requestDelete,
  confirmPendingAction
} = useLeaguesBulkActions(selection)

// Adds edit/delete to the shared copy-link/copy-id items — same reasoning as
// tournaments/index.vue's tournamentContextMenuItems(), now that leagues has
// real CRUD too.
function leagueContextMenuItems(league: League): DropdownMenuItem[] {
  return [
    ...rowContextMenuItems(league),
    { type: 'separator' },
    { label: t('league.rowActions.edit'), icon: ICONS.edit, onSelect: () => openEditModal(league) },
    { label: t('league.rowActions.copy'), icon: ICONS.copy, onSelect: () => openCopyModal(league) },
    { type: 'separator' },
    {
      label: t('league.rowActions.delete'),
      icon: ICONS.delete,
      color: 'error',
      onSelect: () => requestDelete([league])
    }
  ]
}

const tableContextMenuItems = computed<DropdownMenuItem[]>(() =>
  contextMenuRow.value ? leagueContextMenuItems(contextMenuRow.value) : [])

// Selected leagues resolved against the currently filtered set, not the full
// unfiltered data — same reasoning as tournaments/index.vue's
// selectedTournaments.
const selectedLeagues = computed(() =>
  filteredLeagues.value.filter(league => selection.isSelected(league.id)))

const viewMode = ref<'table' | 'grid'>('grid')
const viewModeItems = computed<TabsItem[]>(() => [
  { label: t('league.views.grid'), value: 'grid', icon: ICONS.grid },
  { label: t('league.views.table'), value: 'table', icon: ICONS.table }
])

// Matches /tournaments' default sort and the grid view's own chronological
// order (useLeaguesQuery.ts orders by starts_at) — the table view previously
// defaulted to name, the only column it had a sort on at all.
const sorting = ref([{ id: 'startDate', desc: false }])

const tour = useLeaguesTour()
</script>

<template>
  <UDashboardPanel id="leagues">
    <template #header>
      <UDashboardNavbar :title="$t('league.breadcrumb')" :ui="{ right: 'gap-2' }">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #trailing>
          <USeparator orientation="vertical" class="h-4" />

          <SearchInput
            v-model="search"
            class="w-56 sm:w-64"
            :placeholder="$t('league.searchPlaceholder')"
          />

          <USeparator orientation="vertical" class="h-4" />

          <QueryRefreshControl
            :is-loading="loading"
            :status="status"
            @refresh="refetch"
          />
        </template>

        <template #right>
          <TourStartButton :label="$t('league.tour.startButton')" @start="tour.start()" />

          <USeparator orientation="vertical" class="h-4" />

          <div id="tour-leagues-view-mode">
            <ViewModeTabs v-model="viewMode" :items="viewModeItems" />
          </div>

          <USeparator orientation="vertical" class="h-4" />

          <div id="tour-leagues-add">
            <LeaguesListAddModal v-model="isModalOpen" />
          </div>

          <USeparator orientation="vertical" class="h-4" />

          <NotificationsBellButton />
        </template>
      </UDashboardNavbar>

      <UDashboardToolbar>
        <template #left>
          <!-- Swapped for the bulk-actions bar (same row/height) while
               there's a selection, instead of the filters — see
               TournamentsListBulkActionsBar.vue for why this replaces rather
               than adds a row. -->
          <LeaguesListBulkActionsBar
            v-if="selectedLeagues.length"
            side="left"
            :count="selectedLeagues.length"
            @clear="selection.clear()"
          />
          <div v-else id="tour-leagues-filters">
            <StatusFilterGroup v-model="statusFilter" :items="statusTabs" />
          </div>
        </template>

        <template #right>
          <LeaguesListBulkActionsBar
            v-if="selectedLeagues.length"
            side="right"
            :count="selectedLeagues.length"
            @mark-status="requestedStatus =>
              requestStatusChange(requestedStatus, selectedLeagues)"
            @delete="requestDelete(selectedLeagues)"
          />
          <DateRangePicker
            v-else
            v-model="range"
            icon-only
          />
        </template>
      </UDashboardToolbar>
    </template>

    <template #body>
      <div id="tour-leagues-content">
        <template v-if="viewMode === 'table'">
          <!-- ListSkeleton only for a genuine first load (isPending, no
               cached rows yet) — a background refetch keeps the existing
               rows and uses UTable's own :loading bar instead, same
               convention as associates/index.vue. -->
          <ListSkeleton
            v-if="isPending"
            :count="skeletonCount"
            :columns="columns.length"
          />

          <UContextMenu v-else :items="tableContextMenuItems">
            <UTable
              v-model:sorting="sorting"
              :data="filteredLeagues"
              :columns="columns"
              :loading="loading"
              class="w-full"
              :ui="{ tr: 'cursor-pointer' }"
              @contextmenu="onRowContextmenu"
              @select="(_e, row) => navigateTo(`/leagues/${row.original.uuid}`)"
            />
          </UContextMenu>
        </template>

        <!-- Grid mode's own loading state lives in GridView.vue/Card.vue —
             no separate ListSkeleton grid variant, see their own comments.
             :loading is isPending, not isLoading (2026-08-22) — same fix as
             the table view above: a background refresh keeps the real
             cards, only a genuine first load shows the skeleton grid. -->
        <LeaguesListGridView
          v-else
          :leagues="filteredLeagues"
          :context-menu-items="leagueContextMenuItems"
          :on-edit="openEditModal"
          :selection="selection"
          :loading="isPending"
          :loading-count="skeletonCount"
        />
      </div>
    </template>
  </UDashboardPanel>

  <TourGuide :tour="tour" />

  <LeaguesListEditModal v-model="editModalOpen" :league="editingLeague" />

  <LeaguesListAddModal
    v-model="copyModalOpen"
    hide-trigger
    :source-league="copySourceLeague"
  />

  <ConfirmModal
    v-model:open="bulkConfirmOpen"
    :title="pendingAction?.type === 'delete'
      ? $t('league.bulkActions.confirmDeleteTitle', pendingAction.leagues.length)
      : $t('league.bulkActions.confirmStatusTitle', {
        status: $t(`league.status.${pendingAction?.status}`)
      }, pendingAction?.leagues.length ?? 0)"
    :warning="pendingAction?.type === 'delete' ? $t('common.confirmDeleteWarning') : undefined"
    :confirm-label="pendingAction?.type === 'delete'
      ? $t('league.rowActions.delete')
      : $t('league.bulkActions.confirm')"
    :confirm-color="pendingAction?.type === 'delete' ? 'error' : 'primary'"
    :confirm-icon="pendingAction?.type === 'delete' ? ICONS.delete : undefined"
    @confirm="confirmPendingAction"
  >
    <ul v-if="pendingAction" class="max-h-40 overflow-y-auto text-sm space-y-1">
      <li v-for="league in pendingAction.leagues" :key="league.id">
        {{ league.name }}
      </li>
    </ul>
  </ConfirmModal>
</template>
