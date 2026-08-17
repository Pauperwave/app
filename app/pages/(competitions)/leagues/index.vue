<!-- app\pages\(competitions)\leagues\index.vue -->
<script lang="ts" setup>
// fallow-ignore-file code-duplication -- mirrors events/index.vue and
// tournaments/index.vue's mock-driven layout on purpose; expected to diverge
// once real Supabase tables land
import { add, sub } from 'date-fns'
import type { DropdownMenuItem, TabsItem } from '@nuxt/ui'
import type { League, Range } from '~/types'

const { isModalOpen } = useModalOpenFromQuery()

// Not wired to a filter yet: leagues have no per-item date to filter by (only
// tournaments do). Kept here for visual/toolbar consistency with the tournaments
// page — defaults to "Tutto" (matches HomeDateRangePicker's own "all time" range).
const range = shallowRef<Range>({
  start: sub(new Date(), { years: 10 }),
  end: add(new Date(), { years: 10 })
})

const { t } = useI18n()

const {
  data: leaguesData, isLoading: loading, status, refetch
} = useLeaguesQuery()
const data = computed(() => leaguesData.value ?? [])
const { statusFilter, filteredLeagues, statusTabs } = useLeaguesFilters(data)
const {
  rowContextMenuItems, onRowContextmenu, contextMenuRow
} = useCopyLinkContextMenu<League>('/leagues')
const { editingLeague, editModalOpen, openEditModal } = useLeaguesRowActions()

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
    { label: t('league.rowActions.edit'), icon: ICONS.edit, onSelect: () => openEditModal(league) },
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
  { label: t('league.views.grid'), value: 'grid', icon: 'i-lucide-layout-grid' },
  { label: t('league.views.table'), value: 'table', icon: 'i-lucide-table' }
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

          <QueryRefreshControl :is-loading="loading" :status="status" @refresh="refetch" />
        </template>

        <template #right>
          <UButton
            :label="$t('league.tour.startButton')"
            icon="i-lucide-circle-help"
            color="neutral"
            variant="ghost"
            @click="tour.start()"
          />

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
          <!-- NOTE: The `-ms-1` class aligns with the `DashboardSidebarCollapse` button here. -->
          <HomeDateRangePicker v-else v-model="range" class="-ms-1" />
        </template>
      </UDashboardToolbar>
    </template>

    <template #body>
      <div v-if="loading" class="flex items-center justify-center py-12">
        <UIcon name="i-lucide-loader-circle" class="animate-spin text-3xl text-muted" />
      </div>

      <div v-else id="tour-leagues-content">
        <UContextMenu v-if="viewMode === 'table'" :items="tableContextMenuItems">
          <UTable
            v-model:sorting="sorting"
            :data="filteredLeagues"
            :columns="columns"
            class="w-full"
            :ui="{ tr: 'cursor-pointer' }"
            @contextmenu="onRowContextmenu"
            @select="(_e, row) => navigateTo(`/leagues/${row.original.uuid}`)"
          />
        </UContextMenu>

        <LeaguesListGridView
          v-else
          :leagues="filteredLeagues"
          :context-menu-items="leagueContextMenuItems"
          :on-edit="openEditModal"
          :selection="selection"
        />
      </div>
    </template>
  </UDashboardPanel>

  <TourGuide :tour="tour" />

  <LeaguesListEditModal v-model="editModalOpen" :league="editingLeague" />

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
