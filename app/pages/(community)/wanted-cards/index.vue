<!-- app\pages\(community)\wanted-cards\index.vue -->
<script lang="ts" setup>
import { getGroupedRowModel } from '@tanstack/vue-table'
import type { TabsItem } from '@nuxt/ui'
import type { WantedCard } from '~/types'

const { t } = useI18n()

// isPending (not isLoading): isLoading is true for any fetch in flight, including
// background refetches after invalidateQueries (e.g. changing a card's status) —
// that would unmount the table/grid on every mutation. isPending is only true while
// there is still no data in the cache.
const { data: wantedCardsData, isPending: loading } = useWantedCardsQuery()
const data = computed(() => wantedCardsData.value ?? [])

const tour = useWantedCardsTour()

const viewMode = ref<'table' | 'grid'>('grid')
const viewModeItems = computed<TabsItem[]>(() => [
  { label: t('wantedCard.views.grid'), value: 'grid', icon: 'i-lucide-layout-grid' },
  { label: t('wantedCard.views.table'), value: 'table', icon: 'i-lucide-table' }
])

const {
  currentAssociate,
  statusFilter,
  languageFilter,
  treatmentFilter,
  onlyMine,
  toggleTreatmentFilter,
  filteredCards,
  languageFacetItems,
  selectedLanguage,
  treatmentFacetItems,
  statusTabs
} = useWantedCardsFilters(data)

const selection = useSelection<number>()
const { columns, columnHeaders } = useWantedCardsTableColumns(selection)

const {
  rowContextMenuItems,
  onRowContextmenu,
  tableContextMenuItems,
  editingCard,
  editModalOpen,
  deletingCard,
  deleteConfirmOpen,
  deleting,
  confirmDelete
} = useWantedCardsRowActions()

const {
  pendingAction,
  confirmOpen: bulkConfirmOpen,
  executing: bulkExecuting,
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

// Grouping by player on demand (off by default) — a player with 15 requests can
// collapse into a single expandable row instead of 15 repeated rows with the same
// name, but only when the user asks for it explicitly through the toggle.
const grouping = ref<string[]>([])
const sorting = ref([{ id: 'player', desc: true }])

interface TableColumnRef {
  id: string
  getFilterValue: () => unknown
  getFacetedUniqueValues: () => Map<unknown, number>
  getCanHide: () => boolean
  getIsVisible: () => boolean
  toggleVisibility: (value: boolean) => void
}

interface TableRef {
  tableApi: {
    getColumn: (id: string) => TableColumnRef | undefined
    getAllColumns: () => TableColumnRef[]
  }
}

const table = useTemplateRef<TableRef>('table')
// "Status" hidden by default: it is already implied by the active Found/Searching tab.
const columnVisibility = ref({ status: false })

// Rebuilt every time the menu opens (via :items) — the official Nuxt UI pattern
// (UTable docs, "Column visibility" section): getAllColumns() + getCanHide() +
// toggleVisibility(), not a direct v-model on the individual items.
const columnVisibilityItems = computed(() => {
  void columnVisibility.value
  return (table.value?.tableApi?.getAllColumns() ?? [])
    .filter(column => column.getCanHide())
    .map(column => ({
      label: columnHeaders[column.id] ?? column.id,
      type: 'checkbox' as const,
      checked: column.getIsVisible(),
      onUpdateChecked(checked: boolean) {
        table.value?.tableApi?.getColumn(column.id)?.toggleVisibility(checked)
      },
      onSelect(e: Event) {
        e.preventDefault()
      }
    }))
})

const viewItems = computed(() => columnVisibilityItems.value)

// A button of its own (not inside the "Show columns" menu): shared between table
// and grid through the same `grouping` state.
const isGrouped = computed(() => grouping.value.length > 0)
function toggleGrouping() {
  grouping.value = isGrouped.value ? [] : ['player']
}

// The table sorts through clickable column headers (sortableHeader); the grid has
// no columns, so it uses a dedicated selector instead.
const gridSortField = ref<'player' | 'cardmarketPrice' | 'date' | 'cardName'>('player')
const gridSortDesc = ref(true)
const gridSortItems = computed(() => [
  { label: t('wantedCard.columns.player'), value: 'player' as const },
  { label: t('wantedCard.columns.cardmarketPrice'), value: 'cardmarketPrice' as const },
  { label: t('wantedCard.columns.date'), value: 'date' as const },
  { label: t('wantedCard.columns.name'), value: 'cardName' as const }
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
    return diff * direction
  })
})

interface GridSection {
  player: string | null
  cards: WantedCard[]
}

// Same `grouping` state as the table (the "Group by player" toggle in the "Show
// columns" menu), translated into always-open sections with a heading rather than
// expandable rows — there is no natural equivalent of a collapsible row in a grid
// of visual cards.
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

        <template #right>
          <UButton
            :label="$t('wantedCard.tour.startButton')"
            icon="i-lucide-circle-help"
            color="neutral"
            variant="ghost"
            @click="tour.start()"
          />

          <USeparator orientation="vertical" class="h-4" />

          <ViewModeTabs
            id="tour-wanted-cards-view-mode"
            v-model="viewMode"
            :items="viewModeItems"
          />

          <USeparator orientation="vertical" class="h-4" />

          <WantedCardsListAddModal />

          <USeparator orientation="vertical" class="h-4" />

          <NotificationsBellButton />
        </template>
      </UDashboardNavbar>

      <!-- UDashboardToolbar in #header, like HomeDateRangePicker in
           transactions/index.vue — #left/#right are the official filters/view
           split (flex justify-between). Status and Treatment share the same
           visual language (a UFieldGroup of toggle buttons) instead of mixing
           UTabs (pills) with flat buttons. -->
      <!-- flex-wrap overrides Nuxt UI's default overflow-x-auto: on mobile the
           filters wrap onto several rows instead of ending up in a hidden
           horizontal scroll. -->
      <UDashboardToolbar
        :ui="{
          root: 'flex-wrap h-auto py-2 gap-4',
          left: 'gap-4 flex-wrap',
          right: 'gap-4 flex-wrap'
        }"
      >
        <template #left>
          <!-- Swapped for the bulk-actions bar (same row/height) while there's
               a selection, instead of the filters — see BulkActionsBar.vue for
               why this replaces rather than adds a row. -->
          <WantedCardsListBulkActionsBar
            v-if="selectedCards.length"
            side="left"
            :count="selectedCards.length"
            @clear="selection.clear()"
          />
          <!-- Wrapper with a dedicated id purely to anchor the guided tour to
               the whole filters area (see useWantedCardsTour) — the class
               mirrors UDashboardToolbar's ui.left (gap-4 flex-wrap) so the
               layout stays identical, just nested one level deeper. -->
          <div v-else id="tour-wanted-cards-filters" class="flex items-center gap-4 flex-wrap">
            <!--
              No `-ms-1` here on purpose: it's for icon-only buttons (see
              transactions/index.vue), not a bordered UFieldGroup — measured,
              it already aligns with the table (105px vs 106px) without it.
            -->
            <StatusFilterGroup v-model="statusFilter" :items="statusTabs" />

            <!-- Search by card name hidden for now: this view serves people
                 looking for cards, not people selling them (which is the real
                 use case for search by name) — see the TODO in docs/TODO.md. -->

            <USelectMenu
              v-model="languageFilter"
              :items="languageFacetItems"
              value-key="value"
              :icon="selectedLanguage?.icon"
              :placeholder="$t('wantedCard.filters.languagePlaceholder')"
              :ui="{ content: 'max-h-none' }"
              class="w-40"
            />

            <UFieldGroup>
              <UButton
                v-for="option in treatmentFacetItems"
                :key="option.value"
                :label="option.label"
                color="neutral"
                :variant="treatmentFilter.includes(option.value) ? 'solid' : 'outline'"
                @click="toggleTreatmentFilter(option.value)"
              />
            </UFieldGroup>

            <UTooltip
              :text="!currentAssociate ? $t('wantedCard.filters.onlyMineUnavailable') : undefined"
            >
              <UButton
                :label="$t('wantedCard.filters.onlyMine')"
                icon="i-lucide-user-round"
                color="neutral"
                :variant="onlyMine ? 'solid' : 'outline'"
                :disabled="!currentAssociate"
                @click="onlyMine = !onlyMine"
              />
            </UTooltip>
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
          <!-- Same reason as the #left wrapper: a dedicated id to anchor the
               tour to the whole view area, with classes mirroring ui.right
               (gap-4 flex-wrap). -->
          <div v-else id="tour-wanted-cards-view-controls" class="flex items-center gap-4 flex-wrap">
            <div v-if="viewMode === 'grid'" class="flex items-center gap-2">
              <USelectMenu
                v-model="gridSortField"
                :items="gridSortItems"
                value-key="value"
                :placeholder="$t('wantedCard.grid.sortBy')"
                class="w-40"
              />
              <UButton
                :icon="gridSortDesc
                  ? ICONS.sortDescNumeric
                  : ICONS.sortAscNumeric"
                color="neutral"
                variant="outline"
                @click="gridSortDesc = !gridSortDesc"
              />
            </div>

            <UButton
              :label="$t('wantedCard.filters.groupByPlayer')"
              :icon="ICONS.players"
              color="neutral"
              :variant="isGrouped ? 'solid' : 'outline'"
              @click="toggleGrouping"
            />

            <UDropdownMenu
              v-if="viewMode === 'table'"
              :items="viewItems"
              :content="{ align: 'end' }"
            >
              <UButton
                :label="$t('common.showColumns')"
                color="neutral"
                variant="outline"
                :trailing-icon="ICONS.settingsColumns"
              />
            </UDropdownMenu>
          </div>
        </template>
      </UDashboardToolbar>
    </template>

    <template #body>
      <div v-if="loading" class="flex items-center justify-center py-12">
        <UIcon name="i-lucide-loader-circle" class="animate-spin text-3xl text-muted" />
      </div>

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
            :ui="{ td: 'empty:p-0' }"
            class="w-full"
            @contextmenu="onRowContextmenu"
          />
        </UContextMenu>

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

  <WantedCardsListEditModal v-model="editModalOpen" :card="editingCard" />

  <ConfirmModal
    v-model:open="deleteConfirmOpen"
    :title="$t('wantedCard.contextMenu.deleteConfirmTitle')"
    :warning="$t('common.confirmDeleteWarning')"
    :confirm-label="$t('wantedCard.contextMenu.delete')"
    :confirm-icon="ICONS.delete"
    :loading="deleting"
    @confirm="confirmDelete"
  >
    <MagicCardPreviewTooltip
      v-if="deletingCard"
      :name="deletingCard.cardName"
      :image-url="deletingCard.imageUrl"
    />
  </ConfirmModal>

  <!-- Same component as the single-card delete confirm above, generalized for
       both bulk status changes and bulk delete (useWantedCardsBulkActions.ts). -->
  <ConfirmModal
    v-model:open="bulkConfirmOpen"
    :title="pendingAction?.type === 'delete'
      ? $t('wantedCard.bulkActions.confirmDeleteTitle', pendingAction.cards.length)
      : $t('wantedCard.bulkActions.confirmStatusTitle', {
        status: $t(`wantedCard.status.${pendingAction?.status}`)
      }, pendingAction?.cards.length ?? 0)"
    :warning="pendingAction?.type === 'delete' ? $t('common.confirmDeleteWarning') : undefined"
    :confirm-label="pendingAction?.type === 'delete'
      ? $t('wantedCard.contextMenu.delete')
      : $t('wantedCard.bulkActions.confirm')"
    :confirm-color="pendingAction?.type === 'delete' ? 'error' : 'primary'"
    :confirm-icon="pendingAction?.type === 'delete' ? ICONS.delete : undefined"
    :loading="bulkExecuting"
    @confirm="confirmPendingAction"
  >
    <ul v-if="pendingAction" class="max-h-40 overflow-y-auto text-sm space-y-1">
      <li v-for="card in pendingAction.cards" :key="card.id">
        <MagicCardPreviewTooltip :name="card.cardName" :image-url="card.imageUrl" />
      </li>
    </ul>
  </ConfirmModal>

  <TourGuide :tour="tour" />
</template>
