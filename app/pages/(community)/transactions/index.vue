<!-- app\pages\(community)\transactions\index.vue -->
<script lang="ts" setup>
import { sub } from 'date-fns'
import { getGroupedRowModel } from '@tanstack/vue-table'
import type { Range } from '~/types'
import type { PaymentType } from '#shared/types/transactions'

const range = shallowRef<Range>({
  start: sub(new Date(), { days: 14 }),
  end: new Date()
})

const route = useRoute()
const router = useRouter()
const isModalOpen = ref(false)

const {
  data: transactionsData, isLoading: loading, status, refetch
} = useTransactionsQuery()
const data = computed(() => transactionsData.value ?? [])

// Same StatusFilterGroup used by tournaments/leagues/events (#left) with
// HomeDateRangePicker in #right, not UTabs.
const activeTypeTab = computed<'all' | PaymentType>({
  get: () => (typeof route.query.type === 'string' ? route.query.type as 'all' | PaymentType : 'all'),
  set: (value: string | number) => {
    router.replace({ query: { ...route.query, type: value === 'all' ? undefined : value } })
  }
})

const { filteredTransactions, typeTabs } = useTransactionsFilters(data, range, activeTypeTab)
const {
  editingTransaction, editModalOpen, deletingTransaction, deleteConfirmOpen, deleting,
  confirmDelete, tableContextMenuItems, onRowContextmenu
} = useTransactionsRowActions()

const selection = useSelection<number>()
const { columns } = useTransactionsTableColumns(selection)

// No selection UI wired up here previously — no bulk actions at all despite
// tournaments/wanted-cards having this exact delete-with-confirm pattern for
// a similarly-shaped record (2026-08-16). Same selectedX-filtered-by-selection
// shape as tournaments/index.vue's own selectedTournaments.
const selectedTransactions = computed(() =>
  filteredTransactions.value.filter(transaction => selection.isSelected(transaction.id)))
const {
  pendingDelete, confirmOpen: bulkDeleteConfirmOpen, deleting: bulkDeleting,
  requestBulkDelete, confirmBulkDelete
} = useTransactionsBulkActions()

const sorting = ref([{ id: 'payment_date', desc: true }])

// Hidden once a specific type tab is active: with the tab already saying
// "Quote associative"/"Quote tornei"/etc., a "Tipologia" column repeating the
// same value on every row is redundant. Reappears on "Tutte le transazioni".
const columnVisibility = computed(() => ({ payment_type: activeTypeTab.value === 'all' }))

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
          root: 'flex-wrap h-auto py-2 gap-4',
          left: 'gap-4 flex-wrap',
          right: 'gap-4 flex-wrap'
        }"
      >
        <template #left>
          <TransactionsListBulkActionsBar
            v-if="selectedTransactions.length"
            side="left"
            :count="selectedTransactions.length"
            @clear="selection.clear()"
          />
          <div v-else id="tour-transactions-filters">
            <StatusFilterGroup v-model="activeTypeTab" :items="typeTabs" />
          </div>
        </template>

        <template #right>
          <TransactionsListBulkActionsBar
            v-if="selectedTransactions.length"
            side="right"
            :count="selectedTransactions.length"
            @delete="requestBulkDelete(selectedTransactions)"
          />
          <div v-else id="tour-transactions-actions" class="flex items-center gap-4 flex-wrap">
            <UButton
              :label="$t('transaction.groupByPayer')"
              :icon="ICONS.players"
              color="neutral"
              :variant="isGrouped ? 'solid' : 'outline'"
              @click="toggleGrouping"
            />

            <HomeDateRangePicker v-model="range" class="-ms-1" />
          </div>
        </template>
      </UDashboardToolbar>
    </template>

    <template #body>
      <UContextMenu :items="tableContextMenuItems">
        <UTable
          id="tour-transactions-table"
          v-model:sorting="sorting"
          :column-visibility="columnVisibility"
          :data="filteredTransactions"
          :columns="columns"
          :grouping="grouping"
          :grouping-options="{
            getGroupedRowModel: getGroupedRowModel()
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
    v-model:open="bulkDeleteConfirmOpen"
    :title="$t('transaction.bulkActions.deleteConfirmTitle', pendingDelete?.length ?? 0)"
    :warning="$t('common.confirmDeleteWarning')"
    :confirm-label="$t('transaction.rowActions.delete')"
    :confirm-icon="ICONS.delete"
    :loading="bulkDeleting"
    @confirm="confirmBulkDelete"
  >
    <ul v-if="pendingDelete" class="max-h-40 overflow-y-auto text-sm space-y-1">
      <li v-for="transaction in pendingDelete" :key="transaction.id">
        {{ transaction.payment_amount }}€
        —
        {{ transaction.associate
          ? `${transaction.associate.first_name} ${transaction.associate.last_name}`
          : `${transaction.payer_name} ${transaction.payer_surname}` }}
      </li>
    </ul>
  </ConfirmModal>
</template>
