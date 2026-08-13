<!-- app\pages\(competitions)\events\index.vue -->
<script lang="ts" setup>
// fallow-ignore-file code-duplication -- mirrors leagues/index.vue and
// tournaments/index.vue's mock-driven layout on purpose; expected to diverge
// once real Supabase tables land
import { add, sub } from 'date-fns'
import type { TabsItem } from '@nuxt/ui'
import type { Range } from '~/types'

const { isModalOpen } = useModalOpenFromQuery()

// Defaults to "Tutto" (matches HomeDateRangePicker's own "all time" range): the
// mock events span several months in the past relative to "today", same reasoning
// as tournaments/index.vue — a narrower default would start the page on an empty grid.
const range = shallowRef<Range>({
  start: sub(new Date(), { years: 10 }),
  end: add(new Date(), { years: 10 })
})

const { t } = useI18n()

useSeoMeta({ title: () => t('event.seoTitle') })

const { data: eventsData, isLoading: loading } = useEventsQuery()
const data = computed(() => eventsData.value ?? [])
const { statusFilter, filteredEvents, statusTabs } = useEventsFilters(data, range)
const { columns } = useEventsTableColumns()

const viewMode = ref<'table' | 'grid'>('grid')
const viewModeItems = computed<TabsItem[]>(() => [
  { label: t('event.views.grid'), value: 'grid', icon: 'i-lucide-layout-grid' },
  { label: t('event.views.table'), value: 'table', icon: 'i-lucide-table' }
])

const sorting = ref([{ id: 'startDate', desc: false }])
</script>

<template>
  <UDashboardPanel id="events">
    <template #header>
      <UDashboardNavbar :title="$t('event.breadcrumb')" :ui="{ right: 'gap-2' }">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <ViewModeTabs v-model="viewMode" :items="viewModeItems" />

          <USeparator orientation="vertical" class="h-4" />

          <EventsListAddModal v-model="isModalOpen" />

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
          :data="filteredEvents"
          :columns="columns"
          class="w-full"
        />

        <EventsListGridView v-else :events="filteredEvents" />
      </template>
    </template>
  </UDashboardPanel>
</template>
