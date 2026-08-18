<!-- app\pages\(community)\players\index.vue -->
<script lang="ts" setup>
const route = useRoute()
const router = useRouter()
const { t } = useI18n()

useSeoMeta({ title: () => t('player.breadcrumb') })

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

const tour = usePlayersTour()

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
}
interface TableRef {
  tableApi: {
    getAllColumns: () => TableColumnRef[]
    getColumn: (id: string) => { toggleVisibility: (value: boolean) => void } | undefined
  }
}
const table = useTemplateRef<TableRef>('table')
const columnVisibility = ref({})

const columnVisibilityItems = useColumnVisibilityItems(table, columnVisibility, columnHeaders)
</script>

<template>
  <UDashboardPanel id="players">
    <template #header>
      <ListPageNavbar
        :title="$t('player.breadcrumb')"
        :tour-label="$t('player.tour.startButton')"
        :loading="loading"
        :status="status"
        @refresh="refetch"
        @tour-start="tour.start()"
      >
        <NotificationsBellButton />
      </ListPageNavbar>

      <!-- Same #left toolbar placement as associates/index.vue and
           wanted-cards/index.vue for their StatusFilterGroup. -->
      <UDashboardToolbar>
        <template #left>
          <div id="tour-players-filters">
            <StatusFilterGroup v-model="activeStatusTab" :items="statusTabs" />
          </div>
        </template>

        <template #right>
          <div id="tour-players-actions">
            <UDropdownMenu :items="columnVisibilityItems" :content="{ align: 'end' }">
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

  <TourGuide :tour="tour" />
</template>
