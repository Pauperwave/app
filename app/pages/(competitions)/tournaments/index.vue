<!-- app\pages\(competitions)\tournaments\index.vue -->
<script lang="ts" setup>
// fallow-ignore-file code-duplication -- mirrors events/index.vue and
// leagues/index.vue's mock-driven layout on purpose; expected to diverge
// once real Supabase tables land
import { add, sub } from 'date-fns'
import type { DropdownMenuItem, TabsItem } from '@nuxt/ui'
import type { Range, Tournament } from '~/types'

const { isModalOpen } = useModalOpenFromQuery()

// Defaults to "Tutto" (matches HomeDateRangePicker's own "all time" range): the
// mock tournaments span several months in the past relative to "today", so a
// narrower default (e.g. last 14 days) would start the page on an empty grid.
const range = shallowRef<Range>({
  start: sub(new Date(), { years: 10 }),
  end: add(new Date(), { years: 10 })
})

const { t } = useI18n()

const manageFormatsOpen = ref(false)

const {
  data: tournamentsData, isLoading: loading, status, refetch
} = useTournamentsQuery()
const data = computed(() => tournamentsData.value ?? [])
// Passed to MtgFormatsManageModal so it can disable deleting a format still
// referenced by a tournament (and show how many), instead of only failing
// after the fact.
const formatUsageCounts = computed(() => {
  const counts = new Map<string, number>()
  for (const tournament of data.value) {
    counts.set(tournament.formatUuid, (counts.get(tournament.formatUuid) ?? 0) + 1)
  }
  return counts
})
const {
  statusFilter, formatFilter, filteredTournaments, statusTabs, formatTabs
} = useTournamentsFilters(data, range)
const {
  rowContextMenuItems, onRowContextmenu, contextMenuRow
} = useCopyLinkContextMenu<Tournament>('/tournaments')
const { editingTournament, editModalOpen, openEditModal } = useTournamentsRowActions()

const selection = useSelection<number>()
const { columns } = useTournamentsTableColumns(selection, openEditModal)
const {
  pendingAction, confirmOpen: bulkConfirmOpen, requestStatusChange, requestDelete,
  confirmPendingAction
} = useTournamentsBulkActions(selection)

// Adds edit/delete to the shared copy-link/copy-id items — tournaments has
// real CRUD (unlike events/leagues, still pre-CRUD), so this stays local to
// this page rather than growing useCopyLinkContextMenu.ts a domain-specific
// branch. Delete goes through requestDelete (confirm + undo toast), same as
// the bulk-actions bar's delete, just fed a single-item array.
function tournamentContextMenuItems(tournament: Tournament): DropdownMenuItem[] {
  return [
    ...rowContextMenuItems(tournament),
    { label: t('tournament.rowActions.edit'), icon: ICONS.edit, onSelect: () => openEditModal(tournament) },
    {
      label: t('tournament.rowActions.delete'),
      icon: ICONS.delete,
      color: 'error',
      onSelect: () => requestDelete([tournament])
    }
  ]
}

const tableContextMenuItems = computed<DropdownMenuItem[]>(() =>
  contextMenuRow.value ? tournamentContextMenuItems(contextMenuRow.value) : [])

// Selected tournaments resolved against the currently filtered set, not the
// full unfiltered data — same reasoning as wanted-cards/index.vue's
// selectedCards: a tournament hidden by the active status filter shouldn't
// be actionable even if it stayed selected from before.
const selectedTournaments = computed(() =>
  filteredTournaments.value.filter(tournament => selection.isSelected(tournament.id)))

const viewMode = ref<'table' | 'grid'>('grid')
const viewModeItems = computed<TabsItem[]>(() => [
  { label: t('tournament.views.grid'), value: 'grid', icon: 'i-lucide-layout-grid' },
  { label: t('tournament.views.table'), value: 'table', icon: 'i-lucide-table' }
])

const sorting = ref([{ id: 'startDate', desc: false }])

const tour = useTournamentsTour()
</script>

<template>
  <UDashboardPanel id="tournaments">
    <template #header>
      <UDashboardNavbar :title="$t('tournament.breadcrumb')" :ui="{ right: 'gap-2' }">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #trailing>
          <USeparator orientation="vertical" class="h-4" />

          <QueryRefreshControl :is-loading="loading" :status="status" @refresh="refetch" />
        </template>

        <template #right>
          <UButton
            :label="$t('tournament.tour.startButton')"
            icon="i-lucide-circle-help"
            color="neutral"
            variant="ghost"
            @click="tour.start()"
          />

          <USeparator orientation="vertical" class="h-4" />

          <div id="tour-tournaments-view-mode">
            <ViewModeTabs v-model="viewMode" :items="viewModeItems" />
          </div>

          <USeparator orientation="vertical" class="h-4" />

          <div id="tour-tournaments-add">
            <TournamentsListAddModal v-model="isModalOpen" />
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
          <TournamentsListBulkActionsBar
            v-if="selectedTournaments.length"
            side="left"
            :count="selectedTournaments.length"
            @clear="selection.clear()"
          />
          <div v-else id="tour-tournaments-filters" class="flex items-center gap-4 flex-wrap">
            <StatusFilterGroup v-model="statusFilter" :items="statusTabs" />

            <div class="flex items-center gap-2 shrink-0">
              <!-- Dropdown, not a StatusFilterGroup button row: format isn't a
                 small fixed set like status (5 values) — it's whatever
                 mtg_formats rows exist, up to the 8 the association actually
                 runs (see app/utils/cittadinoFormats.ts). A button per
                 format alongside the status buttons would crowd/wrap the
                 toolbar; a dropdown scales to that count the same way it
                 already does for format selection in AddModal.vue.
                 shrink-0/no flex-wrap: both children (w-40 select + an
                 icon-only button) are small and fixed-width, so this pair
                 never needs to wrap internally — the outer #tour-tournaments-
                 filters row (flex-wrap) is what actually reflows on narrow
                 screens, by moving this whole block to its own line. -->
              <USelectMenu
                v-model="formatFilter"
                :items="formatTabs"
                value-key="value"
                :placeholder="$t('tournament.filters.formatPlaceholder')"
                :icon="ICONS.layers"
                class="w-40"
              />

              <UButton
                :icon="ICONS.settingsGear"
                color="neutral"
                variant="outline"
                :aria-label="$t('mtgFormat.manageModal.title')"
                @click="manageFormatsOpen = true"
              />
            </div>
          </div>
        </template>

        <template #right>
          <TournamentsListBulkActionsBar
            v-if="selectedTournaments.length"
            side="right"
            :count="selectedTournaments.length"
            @mark-status="requestedStatus =>
              requestStatusChange(requestedStatus, selectedTournaments)"
            @delete="requestDelete(selectedTournaments)"
          />
          <!-- NOTE: The `-ms-1` class aligns with the `DashboardSidebarCollapse` button here. -->
          <div v-else id="tour-tournaments-actions">
            <HomeDateRangePicker v-model="range" class="-ms-1" />
          </div>
        </template>
      </UDashboardToolbar>
    </template>

    <template #body>
      <div v-if="loading" class="flex items-center justify-center py-12">
        <UIcon name="i-lucide-loader-circle" class="animate-spin text-3xl text-muted" />
      </div>

      <div v-else id="tour-tournaments-content">
        <UContextMenu v-if="viewMode === 'table'" :items="tableContextMenuItems">
          <UTable
            v-model:sorting="sorting"
            :data="filteredTournaments"
            :columns="columns"
            class="w-full"
            :ui="{ tr: 'cursor-pointer' }"
            @contextmenu="onRowContextmenu"
            @select="(_e, row) => navigateTo(tournamentDetailUrl(row.original))"
          />
        </UContextMenu>

        <TournamentsListGridView
          v-else
          :tournaments="filteredTournaments"
          :context-menu-items="tournamentContextMenuItems"
          :on-edit="openEditModal"
          :selection="selection"
        />
      </div>
    </template>
  </UDashboardPanel>

  <TourGuide :tour="tour" />

  <TournamentsListEditModal v-model="editModalOpen" :tournament="editingTournament" />

  <MtgFormatsManageModal v-model="manageFormatsOpen" :format-usage-counts="formatUsageCounts" />

  <ConfirmModal
    v-model:open="bulkConfirmOpen"
    :title="pendingAction?.type === 'delete'
      ? $t('tournament.bulkActions.confirmDeleteTitle', pendingAction.tournaments.length)
      : $t('tournament.bulkActions.confirmStatusTitle', {
        status: $t(`tournament.status.${pendingAction?.status}`)
      }, pendingAction?.tournaments.length ?? 0)"
    :warning="pendingAction?.type === 'delete' ? $t('common.confirmDeleteWarning') : undefined"
    :confirm-label="pendingAction?.type === 'delete'
      ? $t('tournament.rowActions.delete')
      : $t('tournament.bulkActions.confirm')"
    :confirm-color="pendingAction?.type === 'delete' ? 'error' : 'primary'"
    :confirm-icon="pendingAction?.type === 'delete' ? ICONS.delete : undefined"
    @confirm="confirmPendingAction"
  >
    <ul v-if="pendingAction" class="max-h-40 overflow-y-auto text-sm space-y-1">
      <li v-for="tournament in pendingAction.tournaments" :key="tournament.id">
        {{ tournament.name }}
      </li>
    </ul>
  </ConfirmModal>
</template>
