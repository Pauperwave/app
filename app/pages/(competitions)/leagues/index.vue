<!-- app\pages\(competitions)\leagues\index.vue -->
<script lang="ts" setup>
// fallow-ignore-file code-duplication -- mirrors events/index.vue and
// tournaments/index.vue's mock-driven layout on purpose; expected to diverge
// once real Supabase tables land
import { add, sub } from 'date-fns'
import type { TabsItem } from '@nuxt/ui'
import type { Range } from '~/types'

const { isModalOpen } = useModalOpenFromQuery()

// Not wired to a filter yet: leagues have no per-item date to filter by (only
// tournaments do). Kept here for visual/toolbar consistency with the tournaments
// page — defaults to "Tutto" (matches HomeDateRangePicker's own "all time" range).
const range = shallowRef<Range>({
  start: sub(new Date(), { years: 10 }),
  end: add(new Date(), { years: 10 })
})

const { t } = useI18n()

const { data: leaguesData, isLoading: loading } = useLeaguesQuery()
const data = computed(() => leaguesData.value ?? [])
const { statusFilter, filteredLeagues, statusTabs } = useLeaguesFilters(data)
const { columns } = useLeaguesTableColumns()

const viewMode = ref<'table' | 'grid'>('grid')
const viewModeItems = computed<TabsItem[]>(() => [
  { label: t('league.views.grid'), value: 'grid', icon: 'i-lucide-layout-grid' },
  { label: t('league.views.table'), value: 'table', icon: 'i-lucide-table' }
])

const sorting = ref([{ id: 'name', desc: false }])
</script>

<template>
  <UDashboardPanel id="leagues">
    <template #header>
      <UDashboardNavbar :title="$t('league.breadcrumb')" :ui="{ right: 'gap-2' }">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <ViewModeTabs v-model="viewMode" :items="viewModeItems" />

          <USeparator orientation="vertical" class="h-4" />

          <LeaguesListAddModal v-model="isModalOpen" />

          <USeparator orientation="vertical" class="h-4" />

          <NotificationsBellButton />
        </template>
      </UDashboardNavbar>

      <UDashboardToolbar>
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
        <UTable
          v-if="viewMode === 'table'"
          v-model:sorting="sorting"
          :data="filteredLeagues"
          :columns="columns"
          class="w-full"
        />

        <LeaguesListGridView v-else :leagues="filteredLeagues" />
      </template>
    </template>
  </UDashboardPanel>
</template>
