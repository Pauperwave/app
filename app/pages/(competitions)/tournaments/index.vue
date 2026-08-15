<!-- app\pages\(competitions)\tournaments\index.vue -->
<script lang="ts" setup>
// fallow-ignore-file code-duplication -- mirrors events/index.vue and
// leagues/index.vue's mock-driven layout on purpose; expected to diverge
// once real Supabase tables land
import { add, sub } from 'date-fns'
import type { TabsItem } from '@nuxt/ui'
import type { Range } from '~/types'

const { isModalOpen } = useModalOpenFromQuery()

// Defaults to "Tutto" (matches HomeDateRangePicker's own "all time" range): the
// mock tournaments span several months in the past relative to "today", so a
// narrower default (e.g. last 14 days) would start the page on an empty grid.
const range = shallowRef<Range>({
  start: sub(new Date(), { years: 10 }),
  end: add(new Date(), { years: 10 })
})

const { t } = useI18n()

const {
  data: tournamentsData, isLoading: loading, status, refetch
} = useTournamentsQuery()
const data = computed(() => tournamentsData.value ?? [])
const { statusFilter, filteredTournaments, statusTabs } = useTournamentsFilters(data, range)
const { columns } = useTournamentsTableColumns()
const { rowContextMenuItems, onRowContextmenu, tableContextMenuItems } = useCopyLinkContextMenu('/tournaments')

const viewMode = ref<'table' | 'grid'>('grid')
const viewModeItems = computed<TabsItem[]>(() => [
  { label: t('tournament.views.grid'), value: 'grid', icon: 'i-lucide-layout-grid' },
  { label: t('tournament.views.table'), value: 'table', icon: 'i-lucide-table' }
])

const sorting = ref([{ id: 'startDate', desc: false }])
</script>

<template>
  <UDashboardPanel id="tournaments">
    <template #header>
      <UDashboardNavbar :title="$t('tournament.breadcrumb')" :ui="{ right: 'gap-2' }">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #trailing>
          <USeparator orientation="vertical" class="h-4" />

          <QueryRefreshControl :is-loading="loading" :status="status" @refresh="refetch" />
        </template>

        <template #right>
          <ViewModeTabs v-model="viewMode" :items="viewModeItems" />

          <USeparator orientation="vertical" class="h-4" />

          <TournamentsListAddModal v-model="isModalOpen" />

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
          <StatusFilterGroup v-model="statusFilter" :items="statusTabs" />
        </template>

        <template #right>
          <!-- NOTE: The `-ms-1` class aligns with the `DashboardSidebarCollapse` button here. -->
          <HomeDateRangePicker v-model="range" class="-ms-1" />
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
            v-model:sorting="sorting"
            :data="filteredTournaments"
            :columns="columns"
            class="w-full"
            @contextmenu="onRowContextmenu"
          />
        </UContextMenu>

        <TournamentsListGridView
          v-else
          :tournaments="filteredTournaments"
          :context-menu-items="rowContextMenuItems"
        />
      </template>
    </template>
  </UDashboardPanel>
</template>
