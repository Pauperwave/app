<!-- app\pages\(community)\wanted-cards\index.vue -->
<script lang="ts" setup>
import { getGroupedRowModel } from '@tanstack/vue-table'
import type { TabsItem } from '@nuxt/ui'
import type { WantedCard } from '~/types'
import type { DroppedCardInfo } from '~/composables/wantedCards/useScryfallDragDrop'
import type { WantedCardColorFilter } from '~/composables/wantedCards/useWantedCardsFilters'
import type { VisibilityTableRef } from '~/composables/useColumnVisibilityItems'

const { t } = useI18n()

useSeoMeta({ title: () => t('wantedCard.breadcrumb') })

// ---- Data & tour -------------------------------------------------------- isPending (not
// isLoading): isLoading is true for any fetch in flight, including background refetches after
// invalidateQueries (e.g. changing a card's status), which would unmount the table/grid on every
// mutation. isPending is only true while the cache has no data
const {
  data: wantedCardsData, isPending: loading, isLoading, status, refetch
} = useWantedCardsQuery()
const data = computed(() => wantedCardsData.value ?? [])

const tour = useWantedCardsTour()

// ---- Add-card entry points ------------------------------------------------ The "?action=create"
// convention of associates/requests, tournaments, leagues and events (useModalOpenFromQuery): lets
// the command palette's "New wanted card" action land here with the Add modal open
const { isModalOpen: addModalOpen } = useModalOpenFromQuery()

// Drag a card image off Scryfall onto the page to open the Add modal with its name pre-filled
// (useScryfallDragDrop.ts). The whole document is the drop target, not a scoped template ref: a
// card dropped anywhere on the page should work, and a failed parse (not a Scryfall image) does
// nothing either way
const draggedCard = ref<DroppedCardInfo | null>(null)
const { isOverDropZone } = useScryfallDragDrop(() => document.body, (card) => {
  draggedCard.value = card
  addModalOpen.value = true
})

// ---- View mode (grid/table toggle) --------------------------------------- Defaults to dense: the
// tighter view is the expected default now that the third "Compatta" mode exists
const viewMode = ref<'table' | 'grid' | 'dense'>('dense')
const viewModeItems = computed<TabsItem[]>(() => [
  { label: t('wantedCard.views.grid'), value: 'grid', icon: ICONS.grid },
  { label: t('wantedCard.views.dense'), value: 'dense', icon: ICONS.gridDense },
  { label: t('wantedCard.views.table'), value: 'table', icon: ICONS.table }
])

// A tour step can declare `requiresCardView: true` (see useWantedCardsTour.ts) when its target only
// exists in grid/dense (table has no per-card anchor): this switches away from 'table' before that
// step becomes current, instead of the popover failing to find its target
watch(() => tour.current.value, (step) => {
  if (step?.requiresCardView && viewMode.value === 'table') viewMode.value = 'dense'
})

// ---- Filters --------------------------------------------------------------
const {
  currentAssociate,
  statusFilter,
  colorFilters,
  toggleColorFilter,
  onlyMine,
  filteredCards,
  statusTabs,
  colorTabs
} = useWantedCardsFilters(data)

function isColorTabActive(value: WantedCardColorFilter): boolean {
  return value === 'all' ? colorFilters.value.length === 0 : colorFilters.value.includes(value)
}

// ---- Row selection, row actions & bulk actions -----------------------------
const selection = useSelection<number>()

const {
  rowContextMenuItems,
  onRowContextmenu,
  tableContextMenuItems,
  editingCard,
  editModalOpen,
  deletingCard,
  deleteConfirmOpen,
  confirmDelete
} = useWantedCardsRowActions()

const {
  pendingAction,
  confirmOpen: bulkConfirmOpen,
  requestStatusChange,
  requestDelete,
  confirmPendingAction,
  bulkRefreshPrices,
  bulkCopyNames
} = useWantedCardsBulkActions(selection)

// Selected cards resolved against the currently filtered set, not the full
// unfiltered data — a card hidden by the active status/language/treatment
// filter shouldn't be actionable even if it stayed selected from before.
const selectedCards = computed(() =>
  filteredCards.value.filter(card => selection.isSelected(card.id)))

// ---- Table configuration: columns, grouping, sorting, column visibility ---
const { columns, columnHeaders } = useWantedCardsTableColumns(selection, rowContextMenuItems)

// Grouping by player on demand (off by default) — a player with 15 requests can
// collapse into a single expandable row instead of 15 repeated rows with the same
// name, but only when the user asks for it explicitly through the toggle.
const grouping = ref<string[]>([])
const sorting = ref([{ id: 'player', desc: true }])

const table = useTemplateRef<VisibilityTableRef>('table')
// "Status" is hidden by default: it is implied by the active Found/Searching tab.
// updatedAt/createdBy/updatedBy (audit trail) are hidden by default too, like associates'
// traceability columns
const columnVisibility = ref({
  status: false, createdAt: false, updatedAt: false, createdBy: false, updatedBy: false
})

// "Mostra colonne" section divider: card/request details vs audit trail (see
// columnVisibilityGroups.ts)
const columnVisibilityItems = useColumnVisibilityItems(
  table, columnVisibility, columnHeaders, ['createdBy']
)

const viewItems = computed(() => columnVisibilityItems.value)

// A button of its own (not inside the "Show columns" menu): shared between table
// and grid through the same `grouping` state.
const isGrouped = computed(() => grouping.value.length > 0)
function toggleGrouping() {
  grouping.value = isGrouped.value ? [] : ['player']
}

// ---- Grid-only sorting & sections ------------------------------------------
// The table sorts through clickable column headers (sortableHeader); the grid has
// no columns, so it uses a dedicated selector instead.
const gridSortField = ref<'player' | 'cardmarketPrice' | 'date' | 'cardName' | 'color'>('player')
const gridSortDesc = ref(true)
const gridSortItems = computed(() => [
  { label: t('wantedCard.columns.player'), value: 'player' as const },
  { label: t('wantedCard.columns.cardmarketPrice'), value: 'cardmarketPrice' as const },
  { label: t('wantedCard.columns.date'), value: 'date' as const },
  { label: t('wantedCard.grid.sortByName'), value: 'cardName' as const },
  { label: t('wantedCard.grid.sortByColor'), value: 'color' as const }
])

const sortedCards = computed(() => {
  const field = gridSortField.value
  const direction = gridSortDesc.value ? -1 : 1
  return [...filteredCards.value].sort((a, b) => {
    let diff = 0
    if (field === 'player') diff = a.player.localeCompare(b.player)
    else if (field === 'cardName') diff = a.cardName.localeCompare(b.cardName)
    else if (field === 'cardmarketPrice') diff = (a.cardmarketPrice ?? 0) - (b.cardmarketPrice ?? 0)
    else if (field === 'date') diff = (a.date || '').localeCompare(b.date || '')
    // Finer than the table's "Mana" column sort: color count/identity in WUBRG order (White, then
    // Black, then White-Black) as the second level, ascending mana cost as the third
    else if (field === 'color') {
      diff = compareColorIdentity(a.colorIdentity, b.colorIdentity)
      if (diff === 0) diff = a.cmc - b.cmc
    }
    return diff * direction
  })
})

interface GridSection {
  player: string | null
  cards: WantedCard[]
}

// The same `grouping` state as the table (the "Group by player" toggle in the "Show columns" menu),
// as always-open sections with a heading rather than expandable rows: a grid of visual cards has no
// natural collapsible row
const gridSections = computed<GridSection[]>(() => {
  if (!grouping.value.length) return [{ player: null, cards: sortedCards.value }]

  const groups = new Map<string, WantedCard[]>()
  for (const card of sortedCards.value) {
    const list = groups.get(card.player) ?? []
    list.push(card)
    groups.set(card.player, list)
  }
  return [...groups.entries()]
    .sort(([playerA], [playerB]) => playerA.localeCompare(playerB))
    .map(([player, cards]) => ({ player, cards }))
})
</script>

<template>
  <UDashboardPanel id="wanted-cards">
    <template #header>
      <UDashboardNavbar :title="$t('wantedCard.breadcrumb')" :ui="{ right: 'gap-2' }">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #trailing>
          <USeparator orientation="vertical" class="h-4" />

          <QueryRefreshControl
            :is-loading="isLoading"
            :status="status"
            @refresh="refetch"
          />
        </template>

        <template #right>
          <TourStartButton :label="$t('wantedCard.tour.startButton')" @start="tour.start()" />

          <USeparator orientation="vertical" class="h-4" />

          <ViewModeTabs
            id="tour-wanted-cards-view-mode"
            v-model="viewMode"
            :items="viewModeItems"
          />

          <USeparator orientation="vertical" class="h-4" />

          <WantedCardsListAddModal v-model="addModalOpen" :initial-card="draggedCard" />

          <USeparator orientation="vertical" class="h-4" />

          <NotificationsBellButton />
        </template>
      </UDashboardNavbar>

      <!-- UDashboardToolbar in #header, like DateRangePicker in transactions/index.vue:
           #left/#right are the official filters/view split (flex justify-between). Status and
           Treatment share one visual language (a UFieldGroup of toggle buttons) instead of
           mixing UTabs (pills) with flat buttons -->
      <!-- flex-wrap overrides Nuxt UI's default overflow-x-auto: on mobile the filters wrap
           onto several rows instead of hiding in a horizontal scroll -->
      <UDashboardToolbar
        :ui="{
          root: 'flex-wrap h-auto py-2 gap-4',
          left: 'gap-4 flex-wrap',
          right: 'gap-4 flex-wrap'
        }"
      >
        <template #left>
          <!-- Swapped for the bulk-actions bar (same row/height) while there is a selection,
               instead of the filters: see BulkActionsBar.vue for why it replaces rather than
               adds a row -->
          <WantedCardsListBulkActionsBar
            v-if="selectedCards.length"
            side="left"
            :count="selectedCards.length"
            @clear="selection.clear()"
          />
          <!-- Wrapper with a dedicated id purely to anchor the guided tour to the whole filters
               area (see useWantedCardsTour): the class mirrors UDashboardToolbar's ui.left
               (gap-4 flex-wrap), so the layout is identical, nested one level deeper -->
          <div
            v-else
            id="tour-wanted-cards-filters"
            class="flex items-center gap-4 flex-wrap"
          >
            <WantedCardsListFiltersBar
              v-model:status-filter="statusFilter"
              v-model:only-mine="onlyMine"
              :status-tabs="statusTabs"
              :color-tabs="colorTabs"
              :is-color-tab-active="isColorTabActive"
              :current-associate="currentAssociate"
              :is-grouped="isGrouped"
              @toggle-color="toggleColorFilter"
              @toggle-grouping="toggleGrouping"
            />
          </div>
        </template>

        <template #right>
          <WantedCardsListBulkActionsBar
            v-if="selectedCards.length"
            side="right"
            :count="selectedCards.length"
            @mark-status="status => requestStatusChange(status, selectedCards)"
            @delete="requestDelete(selectedCards)"
            @copy-names="bulkCopyNames(selectedCards)"
            @refresh-prices="bulkRefreshPrices(selectedCards)"
          />
          <!-- Same as the #left wrapper: a dedicated id to anchor the tour to the whole view
               area, with classes mirroring ui.right (gap-4 flex-wrap) -->
          <div
            v-else
            id="tour-wanted-cards-view-controls"
            class="flex items-center gap-4 flex-wrap"
          >
            <WantedCardsListViewControls
              v-model:grid-sort-field="gridSortField"
              v-model:grid-sort-desc="gridSortDesc"
              :view-mode="viewMode"
              :grid-sort-items="gridSortItems"
              :view-items="viewItems"
            />
          </div>
        </template>
      </UDashboardToolbar>
    </template>

    <template #body>
      <ListSkeleton v-if="loading && viewMode === 'table'" :columns="columns.length" />
      <WantedCardsListDenseSkeleton v-else-if="loading && viewMode === 'dense'" />
      <WantedCardsListGridSkeleton v-else-if="loading" />

      <template v-else>
        <UContextMenu v-if="viewMode === 'table'" :items="tableContextMenuItems">
          <UTable
            ref="table"
            v-model:sorting="sorting"
            v-model:column-visibility="columnVisibility"
            :data="filteredCards"
            :columns="columns"
            :grouping="grouping"
            :grouping-options="{
              getGroupedRowModel: getGroupedRowModel()
            }"
            sticky="header"
            class="w-full"
            @contextmenu="onRowContextmenu"
          />
        </UContextMenu>

        <WantedCardsListDenseView
          v-else-if="viewMode === 'dense'"
          :sections="gridSections"
          :context-menu-items="rowContextMenuItems"
          :selection="selection"
        />

        <WantedCardsListGridView
          v-else
          :sections="gridSections"
          :context-menu-items="rowContextMenuItems"
          :selection="selection"
          :show-status="statusFilter === 'all'"
        />
      </template>
    </template>
  </UDashboardPanel>

  <!-- Shown while dragging a card over the page (useScryfallDragDrop.ts): a visual affordance
       only, the drop handling doesn't need it -->
  <div
    v-if="isOverDropZone"
    class="fixed inset-4 z-50 pointer-events-none flex items-center justify-center rounded-xl border-2 border-dashed border-primary bg-black/80"
  >
    <div class="text-center">
      <UIcon :name="ICONS.cardSearch" class="size-10 text-primary mx-auto mb-2" />
      <p class="text-lg font-semibold text-white">
        {{ $t('wantedCard.addModal.dropHint') }}
      </p>
    </div>
  </div>

  <WantedCardsListEditModal v-model="editModalOpen" :card="editingCard" />

  <WantedCardsListConfirmModals
    v-model:delete-confirm-open="deleteConfirmOpen"
    v-model:bulk-confirm-open="bulkConfirmOpen"
    :deleting-card="deletingCard"
    :pending-action="pendingAction"
    :on-confirm-delete="confirmDelete"
    :on-confirm-pending-action="confirmPendingAction"
  />

  <TourGuide :tour="tour" />
</template>
