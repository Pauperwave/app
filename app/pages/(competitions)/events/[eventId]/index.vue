<!-- app\pages\(competitions)\events\[eventId]\index.vue -->
<script lang="ts" setup>
// fallow-ignore-file code-duplication -- see the same comment in
// leagues/[leagueId]/index.vue
// First real (non-mock) detail page for events (2026-08-20). Uuid-based,
// not slug-based — matches events/list/GridView.vue's own `/events/${uuid}`
// link, not migrated to a slug like locations/leagues were.
//
// The left card's own status-colored heatmap (bidirectionally linked to the
// tournament cards below, same as leagues/[leagueId]/index.vue's own) was
// replaced 2026-08-22 by EventsSingleDaySchedule.vue's hour grid (user
// request, "a custom calendar view of that specific day... like Google
// Calendar I can click and create a tournament") — a day-schedule for one
// specific day has no use for a multi-month heatmap's own hover-linking, so
// that machinery was removed along with it rather than kept dead.

const { t } = useI18n()
const route = useRoute()
const eventUuid = computed(() => route.params.eventId as string)

const { data: eventsData, isLoading: eventLoading } = useEventsQuery()
const event = computed(() =>
  eventsData.value?.find(item => item.uuid === eventUuid.value) ?? null)

useSeoMeta({ title: () => event.value?.name ?? t('event.breadcrumb') })

const { breadcrumbItems } = useBreadcrumbs(
  computed(() => (event.value ? { [eventUuid.value]: event.value.name } : {}))
)

const {
  data: tournamentsData, isLoading: tournamentsLoading, status, refetch
} = useTournamentsQuery()
const tournaments = computed(() => (tournamentsData.value ?? [])
  .filter(tournament => tournament.eventUuid === eventUuid.value))

const loading = computed(() => eventLoading.value || tournamentsLoading.value)

const { rowContextMenuItems } = useCopyLinkContextMenu('/tournaments')
const { editingTournament, editModalOpen, openEditModal } = useTournamentsRowActions()
const selection = useSelection<number>()

// DaySchedule.vue's own click-to-create (user request, 2026-08-22, "like
// Google Calendar") — one AddModal instance reused across every slot click,
// re-seeded each time via its initialTime prop (see that component's own
// watch(open, ...)).
const addModalOpen = ref(false)
const addModalInitialTime = ref('20:00')
function openAddModalAt(time: string) {
  addModalInitialTime.value = time
  addModalOpen.value = true
}
</script>

<template>
  <UDashboardPanel id="event">
    <template #header>
      <UDashboardNavbar :title="event?.name ?? $t('event.detail.navbarTitle')">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #trailing>
          <USeparator orientation="vertical" class="h-4" />

          <QueryRefreshControl
            :is-loading="tournamentsLoading"
            :status="status"
            @refresh="refetch"
          />
        </template>

        <template #right>
          <NotificationsBellButton />
        </template>
      </UDashboardNavbar>

      <UDashboardToolbar>
        <template #left>
          <UBreadcrumb :items="breadcrumbItems" class="ms-2" />
        </template>
      </UDashboardToolbar>
    </template>

    <template #body>
      <div v-if="loading" class="flex items-center justify-center py-12">
        <UIcon name="i-lucide-loader-circle" class="animate-spin text-3xl text-muted" />
      </div>

      <div v-else-if="event" class="flex flex-col gap-6">
        <div class="grid items-start gap-4 sm:grid-cols-2">
          <UCard>
            <div class="flex flex-col gap-3">
              <div class="flex items-start justify-between gap-3">
                <h2 class="text-xl font-semibold truncate">
                  {{ event.name }}
                </h2>
                <UBadge
                  :color="eventStatusColor(event.status)"
                  variant="subtle"
                  :icon="EVENT_STATUS_ICONS[event.status]"
                  class="shrink-0"
                >
                  {{ t(`event.status.${event.status}`) }}
                </UBadge>
              </div>

              <div class="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-muted">
                <span v-if="event.organizer" class="flex items-center gap-1.5">
                  <UIcon :name="ICONS.player" class="size-4 shrink-0" />
                  {{ event.organizer }}
                </span>
                <span v-if="event.location" class="flex items-center gap-1.5">
                  <UIcon :name="ICONS.mapPin" class="size-4 shrink-0" />
                  {{ event.location }}
                </span>
              </div>

              <div class="flex items-center gap-1.5 text-sm text-muted flex-wrap">
                <UIcon :name="ICONS.calendar" class="size-4 shrink-0" />
                {{ t('event.detail.dateRange.from') }}
                <DateWithRelativeTooltip :iso-string="event.startDate" :time="false" />
                <template v-if="event.endDate">
                  {{ t('event.detail.dateRange.to') }}
                  <DateWithRelativeTooltip :iso-string="event.endDate" :time="false" />
                </template>
              </div>

              <p class="text-sm text-muted">
                {{ t('event.tournamentsLabel', event.tournamentCount) }}
              </p>
            </div>
          </UCard>

          <UCard :ui="{ header: 'font-semibold' }">
            <template #header>
              {{ t('event.detail.schedule.title') }}
            </template>

            <EventsSingleDaySchedule
              :date="event.startDate"
              :tournaments="tournaments"
              @create-tournament="openAddModalAt"
              @open-tournament="openEditModal"
            />
          </UCard>
        </div>

        <TournamentsListGridView
          :tournaments="tournaments"
          :context-menu-items="rowContextMenuItems"
          :on-edit="openEditModal"
          :selection="selection"
        />
      </div>

      <EmptyState
        v-else
        :message="t('event.detail.notFound')"
      />
    </template>
  </UDashboardPanel>

  <TournamentsListEditModal v-model="editModalOpen" :tournament="editingTournament" />
  <TournamentsListAddModal
    v-if="event"
    v-model="addModalOpen"
    hide-trigger
    :initial-date="event.startDate.substring(0, 10)"
    :initial-time="addModalInitialTime"
    :initial-event-uuid="event.uuid"
  />
</template>
