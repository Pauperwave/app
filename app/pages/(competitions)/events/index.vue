<!-- app\pages\(competitions)\events\index.vue -->
<script lang="ts" setup>
// fallow-ignore-file code-duplication -- mirrors leagues/index.vue and
// tournaments/index.vue's mock-driven layout on purpose; expected to diverge
// once real Supabase tables land
import { add, sub } from 'date-fns'
import type { DropdownMenuItem, TabsItem } from '@nuxt/ui'
import type { Event, Range } from '~/types'

const { isModalOpen } = useModalOpenFromQuery()

// Defaults to "Tutto" (matches DateRangePicker's own "all time" range): the
// mock events span several months in the past relative to "today", same reasoning
// as tournaments/index.vue — a narrower default would start the page on an empty grid.
const range = shallowRef<Range>({
  start: sub(new Date(), { years: 10 }),
  end: add(new Date(), { years: 10 })
})

const { t } = useI18n()

useSeoMeta({ title: () => t('event.seoTitle') })

const {
  data: eventsData, isLoading: loading, isPending, status, refetch
} = useEventsQuery()
const data = computed(() => eventsData.value ?? [])
const { statusFilter, filteredEvents, statusTabs } = useEventsFilters(data, range)

// undefined (ListSkeleton's/GridView's own default count) only on a genuine
// first load — same isPending-vs-isLoading reasoning as tournaments/index.vue.
const skeletonCount = computed(() => (isPending.value ? undefined : filteredEvents.value.length))

const { rowContextMenuItems, onRowContextmenu, contextMenuRow } = useCopyLinkContextMenu<Event>('/events')
const { editingEvent, editModalOpen, openEditModal } = useEventsRowActions()

const selection = useSelection<number>()
const { columns } = useEventsTableColumns(selection, openEditModal)
const {
  pendingAction, confirmOpen: bulkConfirmOpen, requestStatusChange,
  requestDelete, confirmPendingAction
} = useEventsBulkActions(selection)

// Adds edit/delete to the shared copy-link/copy-id items — same reasoning as
// leagues/index.vue's own leagueContextMenuItems().
function eventContextMenuItems(event: Event): DropdownMenuItem[] {
  return [
    ...rowContextMenuItems(event),
    { label: t('event.rowActions.edit'), icon: ICONS.edit, onSelect: () => openEditModal(event) },
    {
      label: t('event.rowActions.delete'),
      icon: ICONS.delete,
      color: 'error',
      onSelect: () => requestDelete([event])
    }
  ]
}

const tableContextMenuItems = computed<DropdownMenuItem[]>(() =>
  contextMenuRow.value ? eventContextMenuItems(contextMenuRow.value) : [])

// Selected events resolved against the currently filtered set, not the full
// unfiltered data — same reasoning as leagues/index.vue's selectedLeagues.
const selectedEvents = computed(() =>
  filteredEvents.value.filter(event => selection.isSelected(event.id)))

const viewMode = ref<'table' | 'grid'>('grid')
const viewModeItems = computed<TabsItem[]>(() => [
  { label: t('event.views.grid'), value: 'grid', icon: 'i-lucide-layout-grid' },
  { label: t('event.views.table'), value: 'table', icon: 'i-lucide-table' }
])

const sorting = ref([{ id: 'startDate', desc: false }])

const tour = useEventsTour()

const bulkConfirmTitle = computed(() => {
  const action = pendingAction.value
  if (!action) return ''
  if (action.type === 'delete') {
    return t('event.bulkActions.confirmDeleteTitle', action.events.length)
  }
  return t('event.bulkActions.confirmStatusTitle', {
    status: t(`event.status.${action.status}`)
  }, action.events.length)
})
</script>

<template>
  <UDashboardPanel id="events">
    <template #header>
      <UDashboardNavbar :title="$t('event.breadcrumb')" :ui="{ right: 'gap-2' }">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #trailing>
          <USeparator orientation="vertical" class="h-4" />

          <QueryRefreshControl :is-loading="loading" :status="status" @refresh="refetch" />
        </template>

        <template #right>
          <UButton
            :label="$t('event.tour.startButton')"
            icon="i-lucide-circle-help"
            color="neutral"
            variant="ghost"
            @click="tour.start()"
          />

          <USeparator orientation="vertical" class="h-4" />

          <div id="tour-events-view-mode">
            <ViewModeTabs v-model="viewMode" :items="viewModeItems" />
          </div>

          <USeparator orientation="vertical" class="h-4" />

          <div id="tour-events-add">
            <EventsListAddModal v-model="isModalOpen" />
          </div>

          <USeparator orientation="vertical" class="h-4" />

          <NotificationsBellButton />
        </template>
      </UDashboardNavbar>

      <UDashboardToolbar>
        <template #left>
          <!-- Swapped for the bulk-actions bar (same row/height) while
               there's a selection, instead of the filters — see
               TournamentsListBulkActionsBar.vue for why this replaces rather
               than adds a row. -->
          <EventsListBulkActionsBar
            v-if="selectedEvents.length"
            side="left"
            :count="selectedEvents.length"
            @clear="selection.clear()"
          />
          <div v-else id="tour-events-filters">
            <StatusFilterGroup v-model="statusFilter" :items="statusTabs" />
          </div>
        </template>

        <template #right>
          <EventsListBulkActionsBar
            v-if="selectedEvents.length"
            side="right"
            :count="selectedEvents.length"
            @mark-status="requestedStatus => requestStatusChange(requestedStatus, selectedEvents)"
            @delete="requestDelete(selectedEvents)"
          />
          <!-- NOTE: The `-ms-1` class aligns with the `DashboardSidebarCollapse` button here. -->
          <div v-else id="tour-events-actions">
            <DateRangePicker v-model="range" class="-ms-1" />
          </div>
        </template>
      </UDashboardToolbar>
    </template>

    <template #body>
      <div id="tour-events-content">
        <template v-if="viewMode === 'table'">
          <!-- ListSkeleton only for a genuine first load (isPending, no
               cached rows yet) — a background refetch keeps the existing
               rows and uses UTable's own :loading bar instead, same
               convention as associates/index.vue. -->
          <ListSkeleton v-if="isPending" :count="skeletonCount" :columns="columns.length" />

          <UContextMenu v-else :items="tableContextMenuItems">
            <UTable
              v-model:sorting="sorting"
              :data="filteredEvents"
              :columns="columns"
              :loading="loading"
              class="w-full"
              :ui="{ tr: 'cursor-pointer' }"
              @contextmenu="onRowContextmenu"
              @select="(_e, row) => navigateTo(`/events/${row.original.uuid}`)"
            />
          </UContextMenu>
        </template>

        <!-- Grid mode's own loading state lives in GridView.vue/Card.vue —
             no separate ListSkeleton grid variant, see their own comments.
             :loading is isPending, not isLoading — a background refresh
             keeps the real cards, only a genuine first load shows the
             skeleton grid. -->
        <EventsListGridView
          v-else
          :events="filteredEvents"
          :context-menu-items="eventContextMenuItems"
          :on-edit="openEditModal"
          :selection="selection"
          :loading="isPending"
          :loading-count="skeletonCount"
        />
      </div>
    </template>
  </UDashboardPanel>

  <TourGuide :tour="tour" />

  <EventsListEditModal v-model="editModalOpen" :event="editingEvent" />

  <ConfirmModal
    v-model:open="bulkConfirmOpen"
    :title="bulkConfirmTitle"
    :warning="pendingAction?.type === 'delete' ? $t('common.confirmDeleteWarning') : undefined"
    :confirm-label="pendingAction?.type === 'delete'
      ? $t('event.rowActions.delete')
      : $t('event.bulkActions.confirm')"
    :confirm-color="pendingAction?.type === 'delete' ? 'error' : 'primary'"
    :confirm-icon="pendingAction?.type === 'delete' ? ICONS.delete : undefined"
    @confirm="confirmPendingAction"
  >
    <ul v-if="pendingAction" class="max-h-40 overflow-y-auto text-sm space-y-1">
      <li v-for="event in pendingAction.events" :key="event.id">
        {{ event.name }}
      </li>
    </ul>
  </ConfirmModal>
</template>
