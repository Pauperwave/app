<!-- app\pages\(community)\transactions\index.vue -->
<script lang="ts" setup>
import { startOfYear, endOfYear } from 'date-fns'
import { getGroupedRowModel } from '@tanstack/vue-table'
import type { Range } from '~/types'
import type { TransactionTypeFilter } from '~/composables/transactions/useTransactionsFilters'
import type { VisibilityTableRef } from '~/composables/useColumnVisibilityItems'

// Was nav-hidden only — see finance/index.vue's own comment.
definePageMeta({ permission: 'view-finance' })

const range = shallowRef<Range>({
  start: startOfYear(new Date()),
  end: endOfYear(new Date())
})

const { t } = useI18n()

useSeoMeta({ title: () => t('transaction.breadcrumb') })

const route = useRoute()
const router = useRouter()
const isModalOpen = ref(false)

const {
  data: transactionsData, isLoading: loading, isPending, status, refetch
} = useTransactionsQuery()
const data = computed(() => transactionsData.value ?? [])

// Every known transaction's date + payer + amount (unfiltered by range/type)
// — same "density hint on DateRangePicker's own popover" pattern as
// tournaments/index.vue's own tournamentDates (user request, 2026-08-29).
// Single color: unlike a tournament's status, a transaction has no
// meaningful per-item state to encode in the dot — the tooltip listing
// every payer+amount for a day already carries the useful information.
const transactionDates = computed(() => data.value.map(transaction => ({
  date: new Date(transaction.payment_date),
  color: 'success' as const,
  label: `${transactionPayerName(transaction) || t('transaction.columns.payer')} — ${
    AMOUNT_FORMATTER.format(transaction.payment_amount)}`
})))

// Quick year-jump next to DateRangePicker, same USelectMenu pattern as
// /finance's own year selector (user request, 2026-08-29) — replaces the
// calendarYears preset buttons DateRangePicker used to render inside its own
// popover just for this page, which made that component need per-page
// customization instead of being the same everywhere. Every year with at
// least one transaction, plus the real current year even if it's still
// empty, sorted newest first — same reasoning as finance/index.vue's
// availableYears.
const availableYears = computed(() => availableTransactionYears(data.value))
const yearItems = computed(() => yearSelectItems(availableYears.value))

// Two-way with `range`, not a separate source of truth — reads back a year
// only when `range` currently matches that exact calendar-year span (blank
// otherwise, e.g. after picking an arbitrary range from DateRangePicker
// itself), and writing it sets `range` to that year's Jan 1 - Dec 31.
const selectedYear = computed<number | undefined>({
  get: () => {
    const { start, end } = range.value
    if (!start || !end) return undefined
    const year = start.getFullYear()
    const matchesYear = start.getTime() === startOfYear(new Date(year, 0, 1)).getTime()
      && end.getTime() === endOfYear(new Date(year, 0, 1)).getTime()
    return matchesYear ? year : undefined
  },
  set: (year) => {
    if (year === undefined) return
    range.value = {
      start: startOfYear(new Date(year, 0, 1)),
      end: endOfYear(new Date(year, 0, 1))
    }
  }
})

// undefined (ListSkeleton's own default count) only on a genuine first load
// — isPending, unlike isLoading, is false once stale data exists to show a
// real count from, even mid-refetch (e.g. the manual refresh button), same
// convention as tournaments/locations' own list pages.
const skeletonCount = computed(() => (isPending.value ? undefined : data.value.length))

// Same StatusFilterGroup used by tournaments/leagues/events (#left) with
// DateRangePicker in #right, not UTabs.
const activeTypeTab = computed<TransactionTypeFilter>({
  get: () => (typeof route.query.type === 'string' ? route.query.type as TransactionTypeFilter : 'all'),
  set: (value: string | number) => {
    router.replace({ query: { ...route.query, type: value === 'all' ? undefined : value } })
  }
})

const { filteredTransactions, typeTabs } = useTransactionsFilters(data, range, activeTypeTab)
const {
  editingTransaction, editModalOpen, deletingTransaction, deleteConfirmOpen, deleting,
  confirmDelete, tableContextMenuItems, onRowContextmenu, rowContextMenuItems
} = useTransactionsRowActions()

const selection = useSelection<number>()
const { columns, columnHeaders } = useTransactionsTableColumns(selection, rowContextMenuItems)

// Single search box matching payer name/surname, transaction id, and receipt
// number — same "one search box" pattern as /associates (user request,
// 2026-08-24). UTable's own globalFilter/globalFilterOptions, not a
// hand-rolled ref+watch pair — see transactionsGlobalFilterFn.ts.
const search = ref('')

// No selection UI wired up here previously — no bulk actions at all despite
// tournaments/wanted-cards having this exact delete-with-confirm pattern for
// a similarly-shaped record (2026-08-16). Same selectedX-filtered-by-selection
// shape as tournaments/index.vue's own selectedTournaments.
const selectedTransactions = computed(() =>
  filteredTransactions.value.filter(transaction => selection.isSelected(transaction.id)))
const {
  pendingAction, confirmOpen: bulkConfirmOpen, processing: bulkProcessing,
  requestBulkDelete, requestBulkTypeChange, confirmPendingAction
} = useTransactionsBulkActions()

const sorting = ref([{ id: 'id', desc: true }])

const table = useTemplateRef<VisibilityTableRef>('table')

// payment_type hidden once a specific type tab is active: with the tab already
// saying "Quote associative"/"Quote tornei"/etc., a "Tipologia" column
// repeating the same value on every row is redundant. Reappears on "Tutte le
// transazioni" — kept in sync with the tab via the watcher below rather than
// a computed, since createdAt/updatedAt/createdBy/updatedBy (audit trail,
// 2026-08-18) also need to live in this same v-model ref for the "Mostra
// colonne" menu to toggle them, same "not needed at a glance" reasoning as
// associates'/wanted-cards' own hidden audit columns.
// Same reasoning as payment_type: "Gettoni" is only ever populated for Token
// Purchase rows, so it's redundant clutter on every other tab (user request,
// 2026-08-23) — shown on "Tutte", "Acquisto gettoni" AND "Da sistemare", since
// the latter can include Token Purchase rows too (any payment_type can have
// the "email sconosciuta" flag, not just Association Fee — fixed 2026-08-27
// alongside eventVisible below, same bug).
const gettoniVisible = (tab: TransactionTypeFilter) =>
  tab === 'all' || tab === 'Token Purchase' || tab === 'errors'
// Blank on Donation only now (renewalKind's own accessorFn never returns a
// badge for that type — see isUnregisteredParticipant, renewalKindBadge.ts)
// — every other tab can show either the new/renewal/unlinked badges
// (Association Fee) or the guest one (Tournament Fee/Event Fee/Token
// Purchase), so it stays visible there too (user request, 2026-08-27).
const renewalKindVisible = (tab: TransactionTypeFilter) => tab !== 'Donation'
// event_name (ck_payment_type_event_link) is only ever set for Tournament
// Fee/Event Fee/Token Purchase rows — always blank on Association
// Fee/Donation, hidden there for the same "redundant clutter" reason as
// gettoniVisible/renewalKindVisible. NOT hidden on "errors" (unlike those
// two): that tab can include Tournament/Event/Token Purchase rows too (any
// payment_type can have the "email sconosciuta" flag), where Evento is
// exactly the useful context — wrongly hidden there until now (user
// feedback, 2026-08-27).
const eventVisible = (tab: TransactionTypeFilter) =>
  tab !== 'Association Fee' && tab !== 'Donation'

const columnVisibility = ref({
  payment_type: activeTypeTab.value === 'all',
  gettoni: gettoniVisible(activeTypeTab.value),
  renewalKind: renewalKindVisible(activeTypeTab.value),
  event_name: eventVisible(activeTypeTab.value),
  createdAt: false,
  updatedAt: false,
  createdBy: false,
  updatedBy: false
})
watch(activeTypeTab, (value) => {
  columnVisibility.value.payment_type = value === 'all'
  columnVisibility.value.gettoni = gettoniVisible(value)
  columnVisibility.value.renewalKind = renewalKindVisible(value)
  columnVisibility.value.event_name = eventVisible(value)
})

// "Mostra colonne" section dividers (user request, 2026-08-27): ID | Da/Data
// | Tipologia/Tesseramento | Importo/Metodo/Ricevuto da | Evento/Gettoni |
// Ricevuta/Note | Trail | Azioni (see columnVisibilityGroups.ts).
const columnVisibilityItems = useColumnVisibilityItems(
  table, columnVisibility, columnHeaders,
  [
    'payer', 'payment_type', 'payment_amount',
    'event_name', 'receipt_ref', 'createdBy', 'actions'
  ]
)

// Same "Group by player" convention as wanted-cards/index.vue: off by default,
// a single toggle collapses repeated payer rows into an expandable group.
const grouping = ref<string[]>([])
const isGrouped = computed(() => grouping.value.length > 0)
function toggleGrouping() {
  grouping.value = isGrouped.value ? [] : ['payer']
}

onMounted(() => {
  if (route.query.action === 'create') {
    isModalOpen.value = true
    router.replace({ query: {} })
  }
})

const tour = useTransactionsTour()
</script>

<template>
  <UDashboardPanel id="payments">
    <template #header>
      <ListPageNavbar
        :title="$t('transaction.breadcrumb')"
        :tour-label="$t('transaction.tour.startButton')"
        :loading="loading"
        :status="status"
        @refresh="refetch"
        @tour-start="tour.start()"
      >
        <template #search>
          <SearchInput
            v-model="search"
            class="w-64 sm:w-80"
            :placeholder="$t('transaction.searchPlaceholder')"
          />
          <USeparator orientation="vertical" class="h-4" />
        </template>

        <div id="tour-transactions-add">
          <TransactionsListAddModal v-model="isModalOpen" />
        </div>

        <USeparator orientation="vertical" class="h-4" />

        <NotificationsBellButton />
      </ListPageNavbar>

      <UDashboardToolbar
        :ui="{
          root: 'flex-wrap h-auto py-2 gap-2',
          left: 'gap-2 flex-wrap',
          right: 'gap-2 flex-wrap'
        }"
      >
        <template #left>
          <TransactionsListBulkActionsBar
            v-if="selectedTransactions.length"
            side="left"
            :count="selectedTransactions.length"
            @clear="selection.clear()"
          />
          <div v-else id="tour-transactions-filters" class="flex items-center gap-2 flex-wrap">
            <StatusFilterGroup v-model="activeTypeTab" :items="typeTabs" />
            <GroupByToggleButton
              :label="$t('transaction.groupByPayer')"
              :grouped="isGrouped"
              @toggle="toggleGrouping"
            />
          </div>
        </template>

        <template #right>
          <TransactionsListBulkActionsBar
            v-if="selectedTransactions.length"
            side="right"
            :count="selectedTransactions.length"
            @change-type="paymentType => requestBulkTypeChange(paymentType, selectedTransactions)"
            @delete="requestBulkDelete(selectedTransactions)"
          />
          <div v-else id="tour-transactions-actions" class="flex items-center gap-2 flex-wrap">
            <!-- NOTE: The `-ms-1` class aligns with the `DashboardSidebarCollapse` button here. -->
            <USelectMenu
              v-model="selectedYear"
              :items="yearItems"
              value-key="value"
              :icon="ICONS.calendar"
              class="w-30 -ms-1"
            />

            <DateRangePicker
              v-model="range"
              :highlighted-dates="transactionDates"
              icon-only
            />

            <ColumnVisibilityMenu :items="columnVisibilityItems" icon-only />
          </div>
        </template>
      </UDashboardToolbar>
    </template>

    <template #body>
      <!-- ListSkeleton only for a genuine first load (isPending, no cached
           rows yet) — a background refetch keeps the existing rows and uses
           UTable's own :loading bar instead, same convention as
           tournaments/locations' own list pages. -->
      <ListSkeleton v-if="isPending" :count="skeletonCount" :columns="columns.length" />

      <UContextMenu v-else :items="tableContextMenuItems">
        <UTable
          id="tour-transactions-table"
          ref="table"
          v-model:sorting="sorting"
          v-model:column-visibility="columnVisibility"
          v-model:global-filter="search"
          :global-filter-options="{ globalFilterFn: transactionsGlobalFilterFn }"
          :data="filteredTransactions"
          :columns="columns"
          :grouping="grouping"
          :grouping-options="{
            getGroupedRowModel: getGroupedRowModel()
          }"
          :virtualize="{
            estimateSize: 35,
            overscan: 12
          }"
          class="flex-1 h-80 shrink-0"
          :loading="loading"
          sticky="header"
          @contextmenu="onRowContextmenu"
        >
          <template #empty>
            <div class="py-12 text-center text-muted">
              {{ $t('transaction.empty') }}
            </div>
          </template>
        </UTable>
      </UContextMenu>
    </template>
  </UDashboardPanel>

  <TourGuide :tour="tour" />

  <TransactionsListEditModal v-model="editModalOpen" :transaction="editingTransaction" />

  <ConfirmModal
    v-model:open="deleteConfirmOpen"
    :title="$t('transaction.rowActions.deleteConfirmTitle')"
    :warning="$t('common.confirmDeleteWarning')"
    :confirm-label="$t('transaction.rowActions.delete')"
    :confirm-icon="ICONS.delete"
    :loading="deleting"
    @confirm="confirmDelete"
  >
    <p v-if="deletingTransaction" class="text-sm text-muted">
      {{ deletingTransaction.payment_amount }}€
      —
      {{ deletingTransaction.associate
        ? `${deletingTransaction.associate.first_name} ${deletingTransaction.associate.last_name}`
        : `${deletingTransaction.payer_name} ${deletingTransaction.payer_surname}` }}
    </p>
  </ConfirmModal>

  <ConfirmModal
    v-if="pendingAction"
    v-model:open="bulkConfirmOpen"
    :title="pendingAction.type === 'delete'
      ? $t('transaction.bulkActions.deleteConfirmTitle', pendingAction.transactions.length)
      : $t('transaction.bulkActions.typeChangeConfirmTitle', pendingAction.transactions.length)"
    :warning="pendingAction.type === 'delete' ? $t('common.confirmDeleteWarning') : undefined"
    :confirm-label="pendingAction.type === 'delete'
      ? $t('transaction.rowActions.delete')
      : $t('transaction.bulkActions.confirm')"
    :confirm-icon="pendingAction.type === 'delete' ? ICONS.delete : undefined"
    :confirm-color="pendingAction.type === 'delete' ? 'error' : 'primary'"
    :loading="bulkProcessing"
    @confirm="confirmPendingAction"
  >
    <ul class="max-h-40 overflow-y-auto text-sm space-y-1">
      <li v-for="transaction in pendingAction.transactions" :key="transaction.id">
        {{ transaction.payment_amount }}€
        —
        {{ transaction.associate
          ? `${transaction.associate.first_name} ${transaction.associate.last_name}`
          : `${transaction.payer_name} ${transaction.payer_surname}` }}
      </li>
    </ul>
  </ConfirmModal>
</template>
