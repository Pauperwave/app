<!-- app\pages\(community)\transactions\index.vue -->
<script lang="ts" setup>
import { startOfYear, endOfYear } from 'date-fns'
import { getGroupedRowModel } from '@tanstack/vue-table'
import type { Range } from '~/types'
import type { PaymentType } from '#shared/types/transactions'

const range = shallowRef<Range>({
  start: startOfYear(new Date()),
  end: endOfYear(new Date())
})

// Transactions are naturally year-bucketed (membership fees, event history) —
// offer the current + 2 previous years as one-click presets, unlike the
// relative "last N months" ranges DateRangePicker otherwise offers.
const currentYear = new Date().getFullYear()
const calendarYears = [currentYear, currentYear - 1, currentYear - 2]

const { t } = useI18n()

useSeoMeta({ title: () => t('transaction.breadcrumb') })

const route = useRoute()
const router = useRouter()
const isModalOpen = ref(false)

const {
  data: transactionsData, isLoading: loading, status, refetch
} = useTransactionsQuery()
const data = computed(() => transactionsData.value ?? [])

// Same StatusFilterGroup used by tournaments/leagues/events (#left) with
// DateRangePicker in #right, not UTabs.
const activeTypeTab = computed<'all' | PaymentType>({
  get: () => (typeof route.query.type === 'string' ? route.query.type as 'all' | PaymentType : 'all'),
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

interface TableColumnRef {
  id: string
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
// 2026-08-23) — shown on "Tutte" and "Acquisto gettoni" only.
const gettoniVisible = (tab: 'all' | PaymentType) => tab === 'all' || tab === 'Token Purchase'

const columnVisibility = ref({
  payment_type: activeTypeTab.value === 'all',
  gettoni: gettoniVisible(activeTypeTab.value),
  createdAt: false,
  updatedAt: false,
  createdBy: false,
  updatedBy: false
})
watch(activeTypeTab, (value) => {
  columnVisibility.value.payment_type = value === 'all'
  columnVisibility.value.gettoni = gettoniVisible(value)
})

const columnVisibilityItems = useColumnVisibilityItems(table, columnVisibility, columnHeaders)

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
            <SearchInput
              v-model="search"
              class="w-56 sm:w-64 lg:w-72"
              :placeholder="$t('transaction.searchPlaceholder')"
            />
            <UTooltip :text="$t('transaction.groupByPayer')">
              <UButton
                :icon="ICONS.players"
                color="neutral"
                :variant="isGrouped ? 'solid' : 'outline'"
                :aria-label="$t('transaction.groupByPayer')"
                @click="toggleGrouping"
              >
                <span class="hidden lg:inline">{{ $t('transaction.groupByPayer') }}</span>
              </UButton>
            </UTooltip>
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
            <DateRangePicker v-model="range" :calendar-years="calendarYears" class="-ms-1" />

            <ColumnVisibilityMenu :items="columnVisibilityItems" />
          </div>
        </template>
      </UDashboardToolbar>
    </template>

    <template #body>
      <UContextMenu :items="tableContextMenuItems">
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
