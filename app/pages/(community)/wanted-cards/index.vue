<!-- app\pages\(community)\wanted-cards\index.vue -->
<script lang="ts" setup>
import { getGroupedRowModel } from '@tanstack/vue-table'
import type { TabsItem } from '@nuxt/ui'
import type { WantedCard } from '~/types'

const { t } = useI18n()

// isPending (non isLoading): isLoading è vero per qualsiasi fetch in corso,
// inclusi i refetch in background dopo invalidateQueries (es. cambio stato
// di una carta) — smonterebbe tabella/griglia ad ogni mutazione. isPending
// è vero solo finché non c'è ancora nessun dato in cache.
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

const { columns, columnHeaders } = useWantedCardsTableColumns()

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

// Raggruppamento per giocatore on demand (non attivo di default) — un
// giocatore come "Francesco Guzzonato" con 15 richieste può diventare una
// sola riga espandibile invece di 15 righe ripetute con lo stesso nome,
// ma solo se l'utente lo richiede esplicitamente tramite il toggle.
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
// "Stato" nascosta di default: è già implicita nella tab Trovate/In cerca attiva.
const columnVisibility = ref({ status: false })

// Rigenerato ogni volta che si apre il menu (via :items) — pattern ufficiale
// Nuxt UI (doc UTable, sezione "Column visibility"): getAllColumns() +
// getCanHide() + toggleVisibility(), non v-model diretto sui singoli item.
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

// Bottone a sé stante (non nel menu "Mostra colonne"): condiviso tra tabella
// e griglia tramite lo stesso stato `grouping`.
const isGrouped = computed(() => grouping.value.length > 0)
function toggleGrouping() {
  grouping.value = isGrouped.value ? [] : ['player']
}

// La tabella ha l'ordinamento per colonna cliccabile (sortableHeader); la
// griglia non ha colonne, quindi usa un selettore dedicato invece.
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

// Stesso stato `grouping` della tabella (toggle "Raggruppa per giocatore" nel
// menu "Mostra colonne"), tradotto in sezioni sempre aperte con intestazione
// invece che righe espandibili — non c'è un equivalente naturale di riga
// collassabile in una griglia di card visuali.
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
      <UDashboardNavbar :title="$t('wantedCard.breadcrumb')" :ui="{ right: 'gap-4' }">
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
          <ViewModeTabs
            id="tour-wanted-cards-view-mode"
            v-model="viewMode"
            :items="viewModeItems"
          />
          <WantedCardsListAddModal />
        </template>
      </UDashboardNavbar>

      <!-- UDashboardToolbar nel #header, come HomeDateRangePicker in
           transactions/index.vue — #left/#right sono lo split ufficiale
           filtri/vista (flex justify-between). Stato e Trattamento
           condividono lo stesso linguaggio visivo (UFieldGroup di bottoni
           toggle) invece di mischiare UTabs (pillole) con bottoni piatti. -->
      <!-- flex-wrap sovrascrive l'overflow-x-auto di default di Nuxt UI:
           su mobile i filtri vanno a capo su più righe invece di finire in
           uno scroll orizzontale nascosto. -->
      <UDashboardToolbar
        :ui="{
          root: 'flex-wrap h-auto py-2 gap-4',
          left: 'gap-4 flex-wrap',
          right: 'gap-4 flex-wrap'
        }"
      >
        <template #left>
          <!-- Wrapper con id dedicato solo per ancorare il tour guidato
               all'intera area filtri (vedi useWantedCardsTour) — la classe
               replica ui.left del UDashboardToolbar (gap-4 flex-wrap) così
               il layout resta identico, solo annidato in un livello in più. -->
          <div id="tour-wanted-cards-filters" class="flex items-center gap-4 flex-wrap">
            <!--
              No `-ms-1` here on purpose: it's for icon-only buttons (see
              transactions/index.vue), not a bordered UFieldGroup — measured,
              it already aligns with the table (105px vs 106px) without it.
            -->
            <UFieldGroup>
              <UButton
                v-for="option in statusTabs"
                :key="option.value"
                :label="option.label"
                color="neutral"
                :variant="statusFilter === option.value ? 'solid' : 'outline'"
                @click="statusFilter = option.value"
              />
            </UFieldGroup>

            <!-- Ricerca per nome carta nascosta per ora: questa vista serve a
                 chi cerca carte, non a chi le vende (che è il vero caso
                 d'uso della ricerca per nome) — vedi TODO in docs/TODO.md. -->

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
          <!-- Stesso motivo del wrapper #left: id dedicato per ancorare il
               tour all'intera area vista, classi che replicano ui.right
               (gap-4 flex-wrap). -->
          <div id="tour-wanted-cards-view-controls" class="flex items-center gap-4 flex-wrap">
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
                  ? 'i-lucide-arrow-down-wide-narrow'
                  : 'i-lucide-arrow-up-narrow-wide'"
                color="neutral"
                variant="outline"
                @click="gridSortDesc = !gridSortDesc"
              />
            </div>

            <UButton
              :label="$t('wantedCard.filters.groupByPlayer')"
              icon="i-lucide-users"
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
                trailing-icon="i-lucide-settings-2"
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
            :ui="{ td: 'empty:p-0' }"
            class="w-full"
            @contextmenu="onRowContextmenu"
          />
        </UContextMenu>

        <WantedCardsListGridView
          v-else
          :sections="gridSections"
          :context-menu-items="rowContextMenuItems"
          :show-status="statusFilter === 'all'"
        />
      </template>
    </template>
  </UDashboardPanel>

  <WantedCardsListEditModal v-model="editModalOpen" :card="editingCard" />

  <UModal
    v-model:open="deleteConfirmOpen"
    :title="$t('wantedCard.contextMenu.deleteConfirmTitle')"
    :description="deletingCard ? deletingCard.cardName : ''"
  >
    <template #footer>
      <div class="flex justify-end gap-2 w-full">
        <UButton
          :label="$t('wantedCard.addModal.cancel')"
          color="neutral"
          variant="subtle"
          :disabled="deleting"
          @click="deleteConfirmOpen = false"
        />
        <UButton
          :label="$t('wantedCard.contextMenu.delete')"
          color="error"
          variant="solid"
          :loading="deleting"
          @click="confirmDelete"
        />
      </div>
    </template>
  </UModal>

  <TourGuide :tour="tour" />
</template>
