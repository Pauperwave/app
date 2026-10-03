<!-- app\pages\(competitions)\locations\index.vue -->
<script lang="ts" setup>
import type { DropdownMenuItem, TabsItem } from '@nuxt/ui'
import type { Location } from '~/types'

// The route is gated like the sidebar link (manage-locations): it used to be nav-hidden only, with
// the route open to any authenticated user (see the permissions.vue table's statusNote)
definePageMeta({ permission: 'manage-locations' })

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

// Slug-based link (not the uuid default) since /locations/[slug] is this
// domain's detail route — see useCopyLinkContextMenu.ts's own comment.
const {
  rowContextMenuItems, onRowContextmenu, tableContextMenuItems
} = useCopyLinkContextMenu<Location>('/locations', location => `/locations/${slugify(location.name)}`)

// Adds edit to the shared copy-link/copy-id items — same reasoning as
// events/index.vue's own eventContextMenuItems(). No delete item: locations
// stays create+edit only (see useLocationsRowActions.ts's own comment).
function locationContextMenuItems(location: Location): DropdownMenuItem[] {
  return [
    ...rowContextMenuItems(location),
    { label: t('location.rowActions.edit'), icon: ICONS.edit, onSelect: () => openEditModal(location) }
  ]
}

// TODO: extract a small utility for the grid/table view-mode buttons, as the same pattern repeats
// in several places?
const viewMode = ref<'table' | 'grid'>('grid')
const viewModeItems = computed<TabsItem[]>(() => [
  { label: t('location.views.grid'), value: 'grid', icon: ICONS.grid },
  { label: t('location.views.table'), value: 'table', icon: ICONS.table }
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
          <!-- ListSkeleton only for a genuine first load (isPending, no cached rows yet): a
               background refetch (e.g. the manual refresh) keeps the rows and uses UTable's
               :loading bar, like associates/index.vue (swapping the whole table out on every
               refresh was worse UX) -->
          <ListSkeleton
            v-if="isPending"
            :count="skeletonCount"
            :columns="columns.length"
          />

          <UContextMenu v-else :items="tableContextMenuItems">
            <UTable
              v-model:sorting="sorting"
              :data="locations"
              :columns="columns"
              :loading="loading"
              class="w-full"
              :ui="{ tr: 'cursor-pointer' }"
              @contextmenu="onRowContextmenu"
              @select="(_e, row) => navigateTo(`/locations/${slugify(row.original.name)}`)"
            />
          </UContextMenu>
        </template>

        <!-- Grid mode's loading state lives in GridView.vue/Card.vue (no separate ListSkeleton
             grid variant, see their comments). :loading is isPending, not isLoading, like the
             table view above: a background refresh keeps the real cards, only a genuine first
             load shows the skeleton grid -->
        <LocationsListGridView
          v-else
          :locations="locations"
          :context-menu-items="locationContextMenuItems"
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
