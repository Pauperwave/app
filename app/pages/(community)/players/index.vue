<!-- app\pages\(community)\players\index.vue -->
<script lang="ts" setup>
const route = useRoute()
const router = useRouter()
const { t } = useI18n()

const {
  data: playersData, isLoading: loading, status, refetch
} = usePlayersQuery()
const data = computed(() => playersData.value ?? [])

// Real counts per status, same convention as associatesStatusCounts in
// associates/index.vue — StatusFilterGroup only renders the trailing count
// badge when `count` is actually set on the item.
const playersStatusCounts = computed(() => {
  const counts = { active: 0, inactive: 0 }
  for (const player of data.value) {
    if (player.is_active) counts.active++
    else counts.inactive++
  }
  return counts
})

// Same StatusFilterGroup used by associates/index.vue and wanted-cards/index.vue
// (a UFieldGroup of toggle buttons), not UTabs.
const statusTabs = computed(() => [
  { label: t('player.tabs.active'), value: 'active', count: playersStatusCounts.value.active },
  { label: t('player.tabs.inactive'), value: 'inactive', count: playersStatusCounts.value.inactive }
])

const activeStatusTab = computed({
  get: () => (typeof route.query.status === 'string' ? route.query.status : 'active'),
  set: (value: string | number) => {
    router.replace({ query: { ...route.query, status: value === 'active' ? undefined : value } })
  }
})

const filteredPlayers = computed(() => data.value.filter(
  player => (activeStatusTab.value === 'active' ? player.is_active : !player.is_active)
))

const { columns, columnHeaders } = usePlayersTableColumns()
const sorting = ref([{ id: 'name', desc: false }])

// Same "Mostra colonne" pattern as wanted-cards/index.vue: rebuilt every time
// the menu opens (via :items"), getAllColumns() + getCanHide() +
// toggleVisibility(), not a direct v-model on the individual items (official
// Nuxt UI convention, UTable docs "Column visibility" section).
interface TableColumnRef {
  id: string
  getCanHide: () => boolean
  getIsVisible: () => boolean
  toggleVisibility: (value: boolean) => void
}
interface TableRef {
  tableApi: { getAllColumns: () => TableColumnRef[] }
}
const table = useTemplateRef<TableRef>('table')
const columnVisibility = ref({})

const columnVisibilityItems = computed(() => {
  void columnVisibility.value
  return (table.value?.tableApi?.getAllColumns() ?? [])
    .filter(column => column.getCanHide())
    .map(column => ({
      label: columnHeaders[column.id] ?? column.id,
      type: 'checkbox' as const,
      checked: column.getIsVisible(),
      onUpdateChecked(checked: boolean) {
        column.toggleVisibility(checked)
      },
      onSelect(e: Event) {
        e.preventDefault()
      }
    }))
})
</script>

<template>
  <UDashboardPanel id="players">
    <template #header>
      <UDashboardNavbar :title="$t('player.breadcrumb')">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #trailing>
          <USeparator orientation="vertical" class="h-4" />

          <QueryRefreshControl :is-loading="loading" :status="status" @refresh="refetch" />
        </template>

        <template #right>
          <NotificationsBellButton />
        </template>
      </UDashboardNavbar>

      <!-- Same #left toolbar placement as associates/index.vue and
           wanted-cards/index.vue for their StatusFilterGroup. -->
      <UDashboardToolbar>
        <template #left>
          <StatusFilterGroup v-model="activeStatusTab" :items="statusTabs" />
        </template>

        <template #right>
          <UDropdownMenu :items="columnVisibilityItems" :content="{ align: 'end' }">
            <UButton
              :label="$t('common.showColumns')"
              color="neutral"
              variant="outline"
              :trailing-icon="ICONS.settingsColumns"
            />
          </UDropdownMenu>
        </template>
      </UDashboardToolbar>
    </template>

    <template #body>
      <UTable
        ref="table"
        v-model:sorting="sorting"
        v-model:column-visibility="columnVisibility"
        :data="filteredPlayers"
        :columns="columns"
        class="flex-1 h-80 shrink-0"
        :loading="loading"
        sticky="header"
      >
        <template #empty>
          <div class="py-12 text-center text-muted">
            {{ $t('player.empty') }}
          </div>
        </template>
      </UTable>
    </template>
  </UDashboardPanel>
</template>
