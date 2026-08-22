<!-- app\pages\(competitions)\locations\index.vue -->
<script lang="ts" setup>
import type { TabsItem } from '@nuxt/ui'

const { isModalOpen } = useModalOpenFromQuery()
const { t } = useI18n()

useSeoMeta({ title: () => t('location.breadcrumb') })

const {
  data: locationsData, isLoading: loading, isPending, status, refetch
} = useLocationsQuery()
const locations = computed(() => locationsData.value ?? [])

// undefined (ListSkeleton's/GridView's own default count) only on a genuine
// first load — same isPending-vs-isLoading reasoning as tournaments/index.vue.
const skeletonCount = computed(() => (isPending.value ? undefined : locations.value.length))

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
      <ListPageNavbar
        :title="$t('location.breadcrumb')"
        :tour-label="$t('location.tour.startButton')"
        :loading="loading"
        :status="status"
        :ui="{ right: 'gap-2' }"
        @refresh="refetch"
        @tour-start="tour.start()"
      >
        <div id="tour-locations-view-mode">
          <ViewModeTabs v-model="viewMode" :items="viewModeItems" />
        </div>

        <USeparator orientation="vertical" class="h-4" />

        <div id="tour-locations-add">
          <LocationsListAddModal v-model="isModalOpen" />
        </div>

        <USeparator orientation="vertical" class="h-4" />

        <NotificationsBellButton />
      </ListPageNavbar>
    </template>

    <template #body>
      <div id="tour-locations-content">
        <template v-if="viewMode === 'table'">
          <!-- ListSkeleton only for a genuine first load (isPending, no
             cached rows yet) — a background refetch (e.g. the manual
             refresh button) keeps the existing rows and uses UTable's own
             :loading bar instead, same convention as associates/index.vue.
             Swapping the whole table out on every refresh (the previous
             behavior here) was flagged as worse UX than associates' -->
          <ListSkeleton v-if="isPending" :count="skeletonCount" :columns="columns.length" />

          <UTable
            v-else
            v-model:sorting="sorting"
            :data="locations"
            :columns="columns"
            :loading="loading"
            class="w-full"
            @select="(_e, row) => navigateTo(`/locations/${slugify(row.original.name)}`)"
          />
        </template>

        <!-- Grid mode's own loading state lives in GridView.vue/Card.vue —
             no separate ListSkeleton grid variant, see their own comments.
             :loading is isPending, not isLoading (2026-08-22) — same fix as
             the table view above: a background refresh keeps the real
             cards, only a genuine first load shows the skeleton grid. -->
        <LocationsListGridView
          v-else
          :locations="locations"
          :on-edit="openEditModal"
          :loading="isPending"
          :loading-count="skeletonCount"
        />
      </div>
    </template>
  </UDashboardPanel>

  <TourGuide :tour="tour" />

  <LocationsListEditModal v-model="editModalOpen" :location="editingLocation" />
</template>
