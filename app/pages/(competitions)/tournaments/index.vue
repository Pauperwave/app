<!-- app\pages\(competitions)\tournaments\index.vue -->
<script lang="ts" setup>
// fallow-ignore-file code-duplication -- mirrors events/index.vue and leagues/index.vue on purpose
import { add } from 'date-fns'
import { getGroupedRowModel } from '@tanstack/vue-table'
import type { DropdownMenuItem, TabsItem } from '@nuxt/ui'
import type { VisibilityTableRef } from '~/composables/useColumnVisibilityItems'
import type { Range, Tournament } from '~/types'

const { t } = useI18n()

useSeoMeta({ title: () => t('tournament.breadcrumb') })

const { isModalOpen } = useModalOpenFromQuery()

// Defaults to "Prossimo anno" (DateRangePicker's next-year preset): upcoming tournaments are the
// common case to land on, not the full history
const range = shallowRef<Range>({
  start: new Date(),
  end: add(new Date(), { years: 1 })
})

const manageFormatsOpen = ref(false)

const {
  data: tournamentsData, isLoading: loading, isPending, status, refetch
} = useTournamentsQuery({ includeTest: true })
const data = computed(() => tournamentsData.value ?? [])

// External (shop-organized, e.g. Magman) tournaments are tracked for schedule comparison, not
// managed by Pauperwave: no acceptance/rounds/awards flow exists for them, so their detail page has
// nothing to show. Hidden from this list by default; toggled back on via the eye button next to
// "Gestisci formati"
const showExternal = ref(false)
const visibleData = computed(() => showExternal.value
  ? data.value
  : data.value.filter(tournament => tournament.status !== 'external'))
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
// A single search box matching tournament name, in the "next to the title, before the refresh
// control" navbar placement of transactions/index.vue's search box
const search = ref('')

const {
  statusFilter, formatFilter, filteredTournaments, statusTabs, formatTabs
} = useTournamentsFilters(visibleData, range, search)

// Every known tournament's date + status color + hover label (unfiltered by range/status/format):
// DateRangePicker.vue's UChip density hint (and tooltip) while picking a range, not just the
// filtered subset. The label is name + stage (tournamentStageText(), "Commander Casual — 1ª tappa")
// rather than name + status: the dot's color already encodes status
const tournamentDates = computed(() => visibleData.value.map(tournament => ({
  date: new Date(tournament.startDate),
  color: tournamentStatusColor(tournament.status),
  label: `${tournament.name}${tournamentStageText(tournament)}`
})))

// Year quick-jump next to DateRangePicker (YearRangePicker.vue)
const availableYears = computed(() => availableTournamentYears(data.value))

// undefined (ListSkeleton's default count) only on a genuine first load: isPending, unlike
// isLoading, is false once stale data exists to show a real count from, even mid-refetch (e.g. the
// manual refresh). The skeleton should render as many cards as the view is about to show, not a
// fixed guess, whenever that's knowable
const skeletonCount = computed(() =>
  (isPending.value ? undefined : filteredTournaments.value.length))
const {
  rowContextMenuItems, onRowContextmenu, contextMenuRow
} = useCopyLinkContextMenu<Tournament>('/tournaments')
const { editingTournament, editModalOpen, openEditModal } = useTournamentsRowActions()

// "Copia torneo": one AddModal instance reused across every copy click, re-seeded via its
// sourceTournament prop, like events/[eventId]/index.vue's click-to-create AddModal
const { copyModalOpen, copySourceTournament, openCopyModal } = useTournamentCopyModal()

const selection = useSelection<number>()
const { columns, columnHeaders } = useTournamentsTableColumns(selection, openEditModal)
const {
  pendingAction, confirmOpen: bulkConfirmOpen, requestStatusChange, requestImageChange,
  requestEntryFeeChange, requestLeagueChange, requestDelete, confirmPendingAction
} = useTournamentsBulkActions(selection)

// Adds edit/copy/delete to the shared copy-link/copy-id items: tournaments has real CRUD (unlike
// events/leagues, still pre-CRUD), so this stays a tournaments-specific composable rather than
// giving useCopyLinkContextMenu.ts a domain branch. Delete goes through requestDelete (confirm +
// undo toast), like the bulk-actions bar's delete fed a single-item array. Shared with
// leagues/[leagueId]/index.vue's tournament cards
const { tournamentContextMenuItems } = useTournamentContextMenuItems(
  rowContextMenuItems, openEditModal, openCopyModal, requestDelete
)

const tableContextMenuItems = computed<DropdownMenuItem[]>(() =>
  contextMenuRow.value ? tournamentContextMenuItems(contextMenuRow.value) : [])

// Selected tournaments resolve against the currently filtered set, not the full data (like
// wanted-cards/index.vue's selectedCards): a tournament hidden by the active status filter isn't
// actionable even if still selected
const selectedTournaments = computed(() =>
  filteredTournaments.value.filter(tournament => selection.isSelected(tournament.id)))

const viewMode = ref<'table' | 'dense' | 'grid'>('grid')
const viewModeItems = computed<TabsItem[]>(() => [
  { label: t('tournament.views.grid'), value: 'grid', icon: ICONS.grid },
  { label: t('tournament.views.dense'), value: 'dense', icon: ICONS.gridDense },
  { label: t('tournament.views.table'), value: 'table', icon: ICONS.table }
])

const sorting = ref([{ id: 'startDate', desc: false }])

// "Mostra colonne" menu — organizer/rounds/event start hidden to keep the table narrow.
const table = useTemplateRef<VisibilityTableRef>('table')
const columnVisibility = ref<Record<string, boolean>>({
  organizer: false,
  roundCount: false,
  event: false
})
const columnVisibilityItems = useColumnVisibilityItems(table, columnVisibility, columnHeaders)

// Table-only (unlike wanted-cards, which also groups the grid into sections): grouping only makes
// sense with the table's columns. One dimension at a time, not multi-level (league/format/location
// are each a flat dimension, and stacking adds nesting complexity nobody needs). Off by default
type GroupByOption = 'none' | 'status' | 'league' | 'format' | 'location'
const groupBy = ref<GroupByOption>('none')
const grouping = computed(() => groupBy.value === 'none' ? [] : [groupBy.value])
const groupByItems = computed(() => [
  { label: t('tournament.filters.groupByNone'), value: 'none' as const },
  { label: t('tournament.filters.groupByStatus'), value: 'status' as const },
  { label: t('tournament.filters.groupByLeague'), value: 'league' as const },
  { label: t('tournament.filters.groupByFormat'), value: 'format' as const },
  { label: t('tournament.filters.groupByLocation'), value: 'location' as const }
])
// An icon-only dropdown trigger (compact by default) instead of a labeled USelectMenu: the
// checkbox-items-in-a-UDropdownMenu shape of StatusChangeBadge.vue's quick-change menu,
// single-select via `checked: item.value === groupBy.value` standing in for a radio group
const groupByLabel = computed(() =>
  groupByItems.value.find(item => item.value === groupBy.value)?.label ?? '')
const groupByMenuItems = computed<DropdownMenuItem[]>(() => groupByItems.value.map(item => ({
  label: item.label,
  checked: item.value === groupBy.value,
  type: 'checkbox' as const,
  onSelect: () => { groupBy.value = item.value }
})))

const tour = useTournamentsTour()

// Extracted from the template once a 4th bulk-action type (entryFee) would have made the inline
// ternary chain in ConfirmModal's :title unreadable
const bulkConfirmTitle = computed(() => {
  const action = pendingAction.value
  if (!action) return ''
  if (action.type === 'delete') {
    return t('tournament.bulkActions.confirmDeleteTitle', action.tournaments.length)
  }
  if (action.type === 'image') {
    return t('tournament.bulkActions.confirmImageTitle', action.tournaments.length)
  }
  if (action.type === 'entryFee') {
    return t('tournament.bulkActions.confirmEntryFeeTitle', action.tournaments.length)
  }
  if (action.type === 'league') {
    return t('tournament.bulkActions.confirmLeagueTitle', {
      league: action.leagueName
    }, action.tournaments.length)
  }
  return t('tournament.bulkActions.confirmStatusTitle', {
    status: t(`tournament.status.${action.status}`)
  }, action.tournaments.length)
})
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

          <SearchInput
            v-model="search"
            class="w-56 sm:w-64"
            :placeholder="$t('tournament.searchPlaceholder')"
          />

          <USeparator orientation="vertical" class="h-4" />

          <QueryRefreshControl
            :is-loading="loading"
            :status="status"
            @refresh="refetch"
          />
        </template>

        <template #right>
          <TourStartButton :label="$t('tournament.tour.startButton')" @start="tour.start()" />

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
          <!-- Swapped for the bulk-actions bar (same row/height) while there is a selection,
               instead of the filters: see TournamentsListBulkActionsBar.vue for why it replaces
               rather than adds a row -->
          <TournamentsListBulkActionsBar
            v-if="selectedTournaments.length"
            side="left"
            :count="selectedTournaments.length"
            @clear="selection.clear()"
          />
          <div
            v-else
            id="tour-tournaments-filters"
            class="flex items-center gap-4 flex-wrap"
          >
            <TournamentsListFiltersBar
              v-model:status-filter="statusFilter"
              v-model:format-filter="formatFilter"
              v-model:show-external="showExternal"
              :status-tabs="statusTabs"
              :format-tabs="formatTabs"
              @open-manage-formats="manageFormatsOpen = true"
            />
          </div>
        </template>

        <template #right>
          <TournamentsListBulkActionsBar
            v-if="selectedTournaments.length"
            side="right"
            :count="selectedTournaments.length"
            @mark-status="requestedStatus =>
              requestStatusChange(requestedStatus, selectedTournaments)"
            @set-image="(imageUrl, imageCardName, imageCardArtist) => requestImageChange(
              { imageUrl, imageCardName, imageCardArtist }, selectedTournaments
            )"
            @set-entry-fee="entryFee => requestEntryFeeChange(entryFee, selectedTournaments)"
            @set-league="(leagueUuid, leagueName) =>
              requestLeagueChange(leagueUuid, leagueName, selectedTournaments)"
            @delete="requestDelete(selectedTournaments)"
          />
          <div
            v-else
            id="tour-tournaments-actions"
            class="flex items-center gap-2"
          >
            <YearRangePicker
              v-model="range"
              :years="availableYears"
              :highlighted-dates="tournamentDates"
            />

            <UTooltip v-if="viewMode === 'table'" :text="groupByLabel">
              <UDropdownMenu :items="groupByMenuItems" :content="{ align: 'end' }">
                <UButton
                  color="neutral"
                  variant="outline"
                  :icon="ICONS.layers"
                  :aria-label="groupByLabel"
                />
              </UDropdownMenu>
            </UTooltip>

            <ColumnVisibilityMenu
              v-if="viewMode === 'table'"
              :items="columnVisibilityItems"
              icon-only
            />
          </div>
        </template>
      </UDashboardToolbar>
    </template>

    <template #body>
      <div id="tour-tournaments-content">
        <template v-if="viewMode === 'table'">
          <!-- ListSkeleton only for a genuine first load (isPending, no cached rows yet): a
               background refetch keeps the rows and uses UTable's :loading bar, like
               associates/index.vue -->
          <ListSkeleton
            v-if="isPending"
            :count="skeletonCount"
            :columns="columns.length"
          />

          <UContextMenu v-else :items="tableContextMenuItems">
            <UTable
              ref="table"
              v-model:sorting="sorting"
              v-model:column-visibility="columnVisibility"
              :data="filteredTournaments"
              :columns="columns"
              :grouping="grouping"
              :grouping-options="{
                getGroupedRowModel: getGroupedRowModel()
              }"
              :loading="loading"
              class="w-full"
              :ui="{ tr: 'cursor-pointer' }"
              @contextmenu="onRowContextmenu"
              @select="(_e, row) => {
                if (!row.getIsGrouped() && row.original.status !== 'external') {
                  navigateTo(tournamentDetailUrl(row.original))
                }
              }"
            />
          </UContextMenu>
        </template>

        <!-- Grid/dense modes' loading state lives in Card.vue/DenseCard.vue (no separate
             ListSkeleton grid variant, see their comments). :loading is isPending, not
             isLoading, like the table view above: a background refresh keeps the real cards,
             only a genuine first load shows the skeleton grid -->
        <TournamentsListDenseView
          v-else-if="viewMode === 'dense'"
          :tournaments="filteredTournaments"
          :context-menu-items="tournamentContextMenuItems"
          :selection="selection"
          :loading="isPending"
          :loading-count="skeletonCount"
        />

        <TournamentsListGridView
          v-else
          :tournaments="filteredTournaments"
          :context-menu-items="tournamentContextMenuItems"
          :on-edit="openEditModal"
          :selection="selection"
          :loading="isPending"
          :loading-count="skeletonCount"
        />
      </div>
    </template>
  </UDashboardPanel>

  <TourGuide :tour="tour" />

  <TournamentsListEditModal
    v-model="editModalOpen"
    :tournament="editingTournament"
  />

  <TournamentsListAddModal
    v-model="copyModalOpen"
    hide-trigger
    :source-tournament="copySourceTournament"
  />

  <MtgFormatsManageModal
    v-model="manageFormatsOpen"
    :format-usage-counts="formatUsageCounts"
  />

  <ConfirmModal
    v-model:open="bulkConfirmOpen"
    :title="bulkConfirmTitle"
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
        <TournamentsStageLabel v-if="tournament.stageNumber" :number="tournament.stageNumber" />
      </li>
    </ul>
  </ConfirmModal>
</template>
