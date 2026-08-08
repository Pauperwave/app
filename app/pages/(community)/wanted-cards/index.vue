<!-- app\pages\(community)\wanted-cards\index.vue -->
<script lang="ts" setup>
import { h, resolveComponent } from 'vue'
import { getFacetedRowModel, getFacetedUniqueValues, getGroupedRowModel } from '@tanstack/vue-table'
import type { Column } from '@tanstack/vue-table'
import type { DropdownMenuItem, TableColumn, TabsItem } from '@nuxt/ui'
import type { WantedCard, WantedCardStatus } from '~/types'
import ManaCost from '~/components/wanted-cards/ManaCost.vue'
import CardPreviewTooltip from '~/components/wanted-cards/CardPreviewTooltip.vue'
import PlayerTag from '~/components/wanted-cards/PlayerTag.vue'

const { t } = useI18n()
const toast = useToast()

const { data: wantedCardsData, isLoading: loading } = useWantedCardsQuery()
const data = computed(() => wantedCardsData.value ?? [])
const { setStatus, deleteWantedCard } = useWantedCardsMutations()

const viewMode = ref<'table' | 'grid'>('grid')
const viewModeItems = computed<TabsItem[]>(() => [
  { label: t('wantedCard.views.grid'), value: 'grid', icon: 'i-lucide-layout-grid' },
  { label: t('wantedCard.views.table'), value: 'table', icon: 'i-lucide-table' }
])

const UBadge = resolveComponent('UBadge')
const UIcon = resolveComponent('UIcon')
const UButton = resolveComponent('UButton')

// Header ordinabile — pattern verbatim dalla doc Nuxt UI per UTable (icona
// che riflette lo stato corrente, toggle asc/desc al click).
function sortableHeader(label: string, column: Column<WantedCard, unknown>) {
  const isSorted = column.getIsSorted()
  return h(UButton, {
    label,
    color: 'neutral',
    variant: 'ghost',
    class: '-mx-2.5',
    icon: isSorted
      ? (isSorted === 'asc' ? 'i-lucide-arrow-up-narrow-wide' : 'i-lucide-arrow-down-wide-narrow')
      : 'i-lucide-arrow-up-down',
    onClick: () => column.toggleSorting(isSorted === 'asc')
  })
}

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

// Etichette leggibili per il menu "Colonne" — stessa mappa i18n usata per
// gli header effettivi delle colonne (pattern da associates/index.vue).
const columnHeaders: Record<string, string> = {
  player: t('wantedCard.columns.player'),
  cmc: t('wantedCard.columns.manaCost'),
  cardName: t('wantedCard.columns.name'),
  price: t('wantedCard.columns.price'),
  copies: t('wantedCard.columns.copies'),
  language: t('wantedCard.columns.language'),
  treatment: t('wantedCard.columns.treatment'),
  date: t('wantedCard.columns.date'),
  status: t('wantedCard.columns.status'),
  notes: t('wantedCard.columns.notes')
}

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

const cardNameFilter = ref('')
// "In cerca" di default — le carte già trovate/abbandonate restano nascoste
// finché non si sceglie esplicitamente un'altra tab.
const statusFilter = ref<'all' | WantedCardStatus>('searching')
// Singola selezione (non più multipla): permette di mostrare l'icona della
// lingua scelta nel trigger tramite la prop `:icon`, cosa che con
// USelectMenu/UInputMenu `multiple` non ha un pattern ufficiale pulito.
const languageFilter = ref<string | undefined>(undefined)
const treatmentFilter = ref<string[]>([])

// Costruito come un unico array dichiarativo, esattamente come l'esempio
// ufficiale Nuxt UI (`ref([{ id: 'email', value: 'james' }])`) — invece di
// mutare lo stato dei filtri con più chiamate imperative a
// column.setFilterValue(), che con questa combinazione di grouping e
// faceted-options non persistevano in modo affidabile.
const columnFilters = computed<{ id: string, value: unknown }[]>(() => {
  const filters: { id: string, value: unknown }[] = []
  if (cardNameFilter.value) filters.push({ id: 'cardName', value: cardNameFilter.value })
  if (statusFilter.value !== 'all') filters.push({ id: 'status', value: statusFilter.value })
  if (languageFilter.value !== undefined) {
    filters.push({ id: 'language', value: languageFilter.value === 'any' ? '' : languageFilter.value })
  }
  if (treatmentFilter.value.length) filters.push({ id: 'treatment', value: treatmentFilter.value })
  return filters
})

// Stessa logica di columnFilters, applicata direttamente a `data` invece che
// tramite l'istanza tanstack di UTable — serve alla vista a griglia, che non
// monta UTable e quindi non ha un tableApi da cui leggere le righe filtrate.
const filteredCards = computed(() => data.value.filter((card) => {
  if (cardNameFilter.value && !card.cardName.toLowerCase().includes(cardNameFilter.value.toLowerCase())) return false
  if (statusFilter.value !== 'all' && card.status !== statusFilter.value) return false
  if (languageFilter.value !== undefined) {
    const wantedLanguage = languageFilter.value === 'any' ? '' : languageFilter.value
    if (card.language !== wantedLanguage) return false
  }
  if (treatmentFilter.value.length && !treatmentFilter.value.some(treatment => card.treatment.includes(treatment))) return false
  return true
}))

// La tabella ha l'ordinamento per colonna cliccabile (sortableHeader); la
// griglia non ha colonne, quindi usa un selettore dedicato invece.
const gridSortField = ref<'player' | 'price' | 'date' | 'cardName'>('player')
const gridSortDesc = ref(true)
const gridSortItems = computed(() => [
  { label: t('wantedCard.columns.player'), value: 'player' as const },
  { label: t('wantedCard.columns.price'), value: 'price' as const },
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
    else if (field === 'price') diff = (a.price ?? 0) - (b.price ?? 0)
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

const statusTabs = computed<{ label: string, value: 'all' | WantedCardStatus }[]>(() => [
  { label: t('wantedCard.filters.statusAll'), value: 'all' },
  { label: t('wantedCard.status.searching'), value: 'searching' },
  { label: t('wantedCard.status.found'), value: 'found' },
  { label: t('wantedCard.status.abandoned'), value: 'abandoned' }
])

// Codici distinti presenti in una colonna, ordinati — base comune per
// costruire gli item dei filtri Lingua/Trattamento. Calcolato direttamente
// da `data` (non da table.value?.tableApi?.getFacetedUniqueValues()) perché
// UTable non è montata in vista griglia — tableApi sarebbe null e i filtri
// risulterebbero vuoti lì, come successo con "Trattamento" in Cards.
function getFacetedCodes(columnId: 'language' | 'treatment'): string[] {
  const codes = new Set<string>()
  for (const card of data.value) {
    if (columnId === 'language') codes.add(card.language)
    else card.treatment.forEach(treatment => codes.add(treatment))
  }
  return Array.from(codes).sort()
}

const languageFacetItems = computed<{ label: string, value: string, icon: string }[]>(() => {
  return getFacetedCodes('language').map((code: string) => ({
    // ComboboxItem (Reka UI, sotto USelectMenu/UInputMenu) non accetta
    // value="" — è riservato per rappresentare "nessuna selezione"/
    // placeholder. Il codice lingua vuoto ("Indifferente") usa quindi il
    // sentinel 'any', tradotto di nuovo in '' in columnFilters prima di
    // filtrare le righe.
    label: t(`wantedCard.languages.${code || 'any'}`),
    value: code || 'any',
    icon: languageFlags[code] ?? 'i-lucide-languages'
  }))
})

const selectedLanguage = computed(() => languageFacetItems.value.find(item => item.value === languageFilter.value))

const treatmentFacetItems = computed<{ label: string, value: string }[]>(() => {
  return getFacetedCodes('treatment').map((code: string) => ({ label: t(`wantedCard.treatments.${code}`), value: code }))
})

// Scrittura riservata alla gestione via RLS lato server (has_management_
// permissions) — un utente non-admin vede l'errore in un toast invece di un
// aggiornamento silenziosamente ignorato.
async function changeStatus(id: number, status: WantedCardStatus) {
  try {
    await setStatus.mutateAsync({ id, status })
  } catch (err) {
    toast.add({
      title: t('wantedCard.contextMenu.updateErrorTitle'),
      description: toErrorMessage(err),
      color: 'error'
    })
  }
}

const editingCard = ref<WantedCard | null>(null)
const editModalOpen = ref(false)
function openEditModal(card: WantedCard) {
  editingCard.value = card
  editModalOpen.value = true
}

const deletingCard = ref<WantedCard | null>(null)
const deleteConfirmOpen = ref(false)
function openDeleteConfirm(card: WantedCard) {
  deletingCard.value = card
  deleteConfirmOpen.value = true
}

const deleting = ref(false)
async function confirmDelete() {
  if (!deletingCard.value) return
  deleting.value = true
  try {
    await deleteWantedCard.mutateAsync(deletingCard.value.id)
    deleteConfirmOpen.value = false
  } catch (err) {
    toast.add({
      title: t('wantedCard.contextMenu.updateErrorTitle'),
      description: toErrorMessage(err),
      color: 'error'
    })
  } finally {
    deleting.value = false
  }
}

// Condiviso tra menu contestuale della tabella e delle card in griglia.
// "Elimina" (come update) è riservato alla gestione via RLS — un utente
// non-admin vede l'errore in un toast, come per gli altri item — vedi
// migrazione 20260807190720 e il TODO in docs/TODO.md.
const STATUS_MENU_ICONS: Record<WantedCardStatus, string> = {
  searching: 'i-lucide-rotate-ccw',
  found: 'i-lucide-check',
  abandoned: 'i-lucide-circle-x'
}

function rowContextMenuItems(card: WantedCard): DropdownMenuItem[] {
  const statusItems = WANTED_CARD_STATUSES
    .filter(status => status !== card.status)
    .map(status => ({
      label: t(`wantedCard.contextMenu.markAs.${status}`),
      icon: STATUS_MENU_ICONS[status],
      onSelect: () => changeStatus(card.id, status)
    }))

  return [
    ...statusItems,
    {
      label: t('wantedCard.contextMenu.edit'),
      icon: 'i-lucide-pencil',
      onSelect: () => openEditModal(card)
    },
    { type: 'separator' },
    {
      label: t('wantedCard.contextMenu.delete'),
      icon: 'i-lucide-trash',
      color: 'error',
      onSelect: () => openDeleteConfirm(card)
    }
  ]
}

// Popolato dal `:on-contextmenu` di UTable al tasto destro su una riga — la
// UContextMenu che avvolge la tabella non conosce da sé la riga cliccata,
// quindi la aggiorniamo qui e i suoi `:items` sono ricalcolati di conseguenza.
const contextMenuRow = ref<WantedCard | null>(null)
function onRowContextmenu(_e: Event, row: { original: WantedCard }) {
  contextMenuRow.value = row.original
}
const tableContextMenuItems = computed(() => contextMenuRow.value ? rowContextMenuItems(contextMenuRow.value) : [])

function toggleTreatmentFilter(value: string) {
  const index = treatmentFilter.value.indexOf(value)
  if (index === -1) treatmentFilter.value = [...treatmentFilter.value, value]
  else treatmentFilter.value = treatmentFilter.value.filter(item => item !== value)
}

const languageFlags: Record<string, string> = {
  en: 'i-circle-flags-gb',
  it: 'i-circle-flags-it',
  es: 'i-circle-flags-es',
  fr: 'i-circle-flags-fr',
  de: 'i-circle-flags-de',
  ja: 'i-circle-flags-jp'
}

const columns: TableColumn<WantedCard>[] = [
  {
    accessorKey: 'player',
    header: ({ column }) => sortableHeader(t('wantedCard.columns.player'), column),
    // Ordina i gruppi per numero di richieste (subRows), non alfabeticamente
    // per nome — è quello che serve davvero quando la tabella è raggruppata.
    sortingFn: (rowA, rowB) => (rowA.subRows?.length ?? 0) - (rowB.subRows?.length ?? 0),
    cell: ({ row, getValue }) => {
      if (!row.getIsGrouped()) return h(PlayerTag, { name: getValue<string>() })
      return h('button', {
        type: 'button',
        class: 'flex items-center gap-1.5 font-medium cursor-pointer',
        onClick: () => row.toggleExpanded()
      }, [
        h(UIcon, { name: row.getIsExpanded() ? 'i-lucide-chevron-down' : 'i-lucide-chevron-right', class: 'size-4' }),
        h(PlayerTag, { name: getValue<string>() }),
        h(UBadge, { color: 'neutral', variant: 'subtle', size: 'sm' }, () => String(row.subRows.length))
      ])
    }
  },
  {
    accessorKey: 'cmc',
    header: ({ column }) => sortableHeader(t('wantedCard.columns.manaCost'), column),
    // Ordinamento da collezione convenzionale MTG: prima il gruppo colore
    // (W, U, B, R, G, multicolore, incolore), poi il costo di mana crescente
    // — stesso algoritmo di MagicTheGathering/league (colorGroupRank).
    sortingFn: (rowA, rowB) => {
      const colorDiff = colorGroupRank(rowA.original.colorIdentity) - colorGroupRank(rowB.original.colorIdentity)
      return colorDiff !== 0 ? colorDiff : rowA.original.cmc - rowB.original.cmc
    },
    cell: ({ row }) => row.getIsGrouped() ? null : h(ManaCost, { manaCost: row.original.manaCost, size: 'sm' })
  },
  {
    accessorKey: 'cardName',
    header: ({ column }) => sortableHeader(t('wantedCard.columns.name'), column),
    filterFn: 'includesString',
    // Niente più link a Scryfall al click: su mobile l'hover non esiste, e
    // CardPreviewTooltip gestisce già il tap con una modale a schermo intero
    // — stesso comportamento di magic/card/Tooltip.vue in MagicTheGathering/blog.
    cell: ({ row }) => row.getIsGrouped()
      ? null
      : h(CardPreviewTooltip, { name: row.original.cardName, imageUrl: row.original.imageUrl })
  },
  {
    accessorKey: 'price',
    header: ({ column }) => sortableHeader(t('wantedCard.columns.price'), column),
    cell: ({ row }) => {
      if (row.getIsGrouped() || row.original.price === null) return null
      return `${row.original.price.toFixed(2)} €`
    }
  },
  {
    accessorKey: 'copies',
    header: ({ column }) => sortableHeader(t('wantedCard.columns.copies'), column),
    cell: ({ row }) => row.getIsGrouped() ? null : row.original.copies
  },
  {
    accessorKey: 'language',
    header: ({ column }) => sortableHeader(t('wantedCard.columns.language'), column),
    filterFn: 'equals',
    cell: ({ row }) => {
      if (row.getIsGrouped()) return null
      const language = row.original.language || 'any'
      return h('div', { class: 'flex items-center gap-1.5' }, [
        h(UIcon, { name: languageFlags[language] ?? 'i-lucide-languages', class: 'size-4 shrink-0' }),
        t(`wantedCard.languages.${language}`)
      ])
    }
  },
  {
    accessorKey: 'treatment',
    header: t('wantedCard.columns.treatment'),
    filterFn: 'arrIncludesSome',
    // Il valore di colonna è già un array (più trattamenti per riga): serve
    // spacchettarlo per far contare a getFacetedUniqueValues() ogni singolo
    // trattamento, non l'intero array come "un" valore unico.
    getUniqueValues: (row: WantedCard) => row.treatment,
    cell: ({ row }) => row.getIsGrouped()
      ? null
      : h('div', { class: 'flex flex-wrap gap-1' },
          row.original.treatment.map(value => h(UBadge, { key: value, color: 'neutral', variant: 'subtle', size: 'sm' }, () => t(`wantedCard.treatments.${value}`)))
        )
  },
  {
    accessorKey: 'date',
    header: ({ column }) => sortableHeader(t('wantedCard.columns.date'), column),
    cell: ({ row }) => row.getIsGrouped() ? null : row.original.date
  },
  {
    accessorKey: 'status',
    header: ({ column }) => sortableHeader(t('wantedCard.columns.status'), column),
    filterFn: 'equals',
    cell: ({ row }) => {
      if (row.getIsGrouped()) return null
      return h(UBadge, {
        color: wantedCardStatusColor(row.original.status),
        variant: 'subtle'
      }, () => t(`wantedCard.status.${row.original.status}`))
    }
  },
  {
    accessorKey: 'notes',
    header: t('wantedCard.columns.notes'),
    meta: { class: { td: 'text-muted max-w-64 whitespace-normal break-words' } },
    cell: ({ row }) => row.getIsGrouped() ? null : row.original.notes
  }
]
</script>

<template>
  <UDashboardPanel id="wanted-cards">
    <template #header>
      <UDashboardNavbar :title="$t('wantedCard.breadcrumb')" :ui="{ right: 'gap-4' }">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <ViewModeTabs v-model="viewMode" :items="viewModeItems" />
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
          <!-- No `-ms-1` here on purpose: it's for icon-only buttons (see transactions/index.vue), not a bordered UFieldGroup — measured, it already aligns with the table (105px vs 106px) without it. -->
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
               chi cerca carte, non a chi le vende (che è il vero caso d'uso
               della ricerca per nome) — vedi TODO in docs/TODO.md. -->

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
        </template>

        <template #right>
          <div v-if="viewMode === 'grid'" class="flex items-center gap-2">
            <USelectMenu
              v-model="gridSortField"
              :items="gridSortItems"
              value-key="value"
              :placeholder="$t('wantedCard.grid.sortBy')"
              class="w-40"
            />
            <UButton
              :icon="gridSortDesc ? 'i-lucide-arrow-down-wide-narrow' : 'i-lucide-arrow-up-narrow-wide'"
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

          <UDropdownMenu v-if="viewMode === 'table'" :items="viewItems" :content="{ align: 'end' }">
            <UButton
              :label="$t('common.showColumns')"
              color="neutral"
              variant="outline"
              trailing-icon="i-lucide-settings-2"
            />
          </UDropdownMenu>
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
            :column-filters="columnFilters"
            :data="data"
            :columns="columns"
            :grouping="grouping"
            :grouping-options="{
              getGroupedRowModel: getGroupedRowModel()
            }"
            :faceted-options="{
              getFacetedRowModel: getFacetedRowModel(),
              getFacetedUniqueValues: getFacetedUniqueValues()
            }"
            :on-contextmenu="onRowContextmenu"
            :ui="{ td: 'empty:p-0' }"
            class="w-full"
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
</template>
