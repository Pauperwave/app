<!-- app\pages\(competitions)\tournaments\index.vue -->
<script lang="ts" setup>
import { add, sub } from 'date-fns'
import type { TabsItem } from '@nuxt/ui'
import type { Range } from '~/types'

const route = useRoute()
const router = useRouter()
const isModalOpen = ref(false)

onMounted(() => {
  if (route.query.action === 'create') {
    isModalOpen.value = true
    router.replace({ query: {} })
  }
})

// Defaults to "Tutto" (matches HomeDateRangePicker's own "all time" range): the
// mock tournaments span several months in the past relative to "today", so a
// narrower default (e.g. last 14 days) would start the page on an empty grid.
const range = shallowRef<Range>({
  start: sub(new Date(), { years: 10 }),
  end: add(new Date(), { years: 10 })
})

const { t } = useI18n()

const { tournaments: data, loading } = useTournamentsQuery()
const { statusFilter, filteredTournaments, statusTabs } = useTournamentsFilters(data, range)
const { columns } = useTournamentsTableColumns()

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

        <template #right>
          <ViewModeTabs v-model="viewMode" :items="viewModeItems" />
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
          :data="filteredTournaments"
          :columns="columns"
          class="w-full"
        />

        <TournamentsListGridView v-else :tournaments="filteredTournaments" />
      </template>
    </template>
  </UDashboardPanel>
</template>
