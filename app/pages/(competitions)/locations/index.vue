<!-- app\pages\(competitions)\locations\index.vue -->
<script lang="ts" setup>
import type { TabsItem } from '@nuxt/ui'

const { isModalOpen } = useModalOpenFromQuery()
const { t } = useI18n()

const {
  data: locationsData, isLoading: loading, status, refetch
} = useLocationsQuery()
const locations = computed(() => locationsData.value ?? [])

const { editingLocation, editModalOpen, openEditModal } = useLocationsRowActions()
const { columns } = useLocationsTableColumns(openEditModal)

const viewMode = ref<'table' | 'grid'>('grid')
const viewModeItems = computed<TabsItem[]>(() => [
  { label: t('location.views.grid'), value: 'grid', icon: 'i-lucide-layout-grid' },
  { label: t('location.views.table'), value: 'table', icon: 'i-lucide-table' }
])

const sorting = ref([{ id: 'name', desc: false }])

const tour = useLocationsTour()
</script>

<template>
  <UDashboardPanel id="locations">
    <template #header>
      <UDashboardNavbar :title="$t('location.breadcrumb')" :ui="{ right: 'gap-2' }">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #trailing>
          <USeparator orientation="vertical" class="h-4" />

          <QueryRefreshControl :is-loading="loading" :status="status" @refresh="refetch" />
        </template>

        <template #right>
          <UButton
            :label="$t('location.tour.startButton')"
            icon="i-lucide-circle-help"
            color="neutral"
            variant="ghost"
            @click="tour.start()"
          />

          <USeparator orientation="vertical" class="h-4" />

          <div id="tour-locations-view-mode">
            <ViewModeTabs v-model="viewMode" :items="viewModeItems" />
          </div>

          <USeparator orientation="vertical" class="h-4" />

          <div id="tour-locations-add">
            <LocationsListAddModal v-model="isModalOpen" />
          </div>

          <USeparator orientation="vertical" class="h-4" />

          <NotificationsBellButton />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div v-if="loading" class="flex items-center justify-center py-12">
        <UIcon name="i-lucide-loader-circle" class="animate-spin text-3xl text-muted" />
      </div>

      <div v-else id="tour-locations-content">
        <UTable
          v-if="viewMode === 'table'"
          v-model:sorting="sorting"
          :data="locations"
          :columns="columns"
          class="w-full"
        />

        <LocationsListGridView
          v-else
          :locations="locations"
          :on-edit="openEditModal"
        />
      </div>
    </template>
  </UDashboardPanel>

  <TourGuide :tour="tour" />

  <LocationsListEditModal v-model="editModalOpen" :location="editingLocation" />
</template>
