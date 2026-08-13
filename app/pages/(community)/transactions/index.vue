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

const { data: transactionsData, isLoading: loading } = useTransactionsQuery()
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
const { columns } = useTransactionsTableColumns()
const {
  editingTransaction, editModalOpen, tableContextMenuItems, onRowContextmenu
} = useTransactionsRowActions()

const table = useTemplateRef('table')
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
</script>

<template>
  <UDashboardPanel id="payments">
    <template #header>
      <UDashboardNavbar :title="$t('transaction.breadcrumb')">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <TransactionsListAddModal v-model="isModalOpen" />

          <USeparator orientation="vertical" class="h-4" />

          <NotificationsBellButton />
        </template>
      </UDashboardNavbar>

      <UDashboardToolbar
        :ui="{
          root: 'flex-wrap h-auto py-2 gap-4',
          left: 'gap-4 flex-wrap',
          right: 'gap-4 flex-wrap'
        }"
      >
        <template #left>
          <StatusFilterGroup v-model="activeTypeTab" :items="typeTabs" />
        </template>

        <template #right>
          <UButton
            :label="$t('transaction.groupByPayer')"
            :icon="ICONS.players"
            color="neutral"
            :variant="isGrouped ? 'solid' : 'outline'"
            @click="toggleGrouping"
          />

          <HomeDateRangePicker v-model="range" class="-ms-1" />
        </template>
      </UDashboardToolbar>
    </template>

    <template #body>
      <UContextMenu :items="tableContextMenuItems">
        <UTable
          ref="table"
          v-model:sorting="sorting"
          :column-visibility="columnVisibility"
          :data="filteredTransactions"
          :columns="columns"
          :grouping="grouping"
          :grouping-options="{
            getGroupedRowModel: getGroupedRowModel()
          }"
          class="flex-1 h-80 shrink-0"
          :ui="{ td: 'empty:p-0 empty:border-0' }"
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

  <TransactionsListEditModal v-model="editModalOpen" :transaction="editingTransaction" />
</template>
