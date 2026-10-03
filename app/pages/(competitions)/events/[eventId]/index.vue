<!-- app\pages\(competitions)\events\[eventId]\index.vue -->
<script lang="ts" setup>
import type { TabsItem } from '@nuxt/ui'
// fallow-ignore-file code-duplication -- see the same comment in leagues/[leagueId]/index.vue
// The first real (non-mock) detail page for events. Uuid-based, not slug-based: it matches
// events/list/GridView.vue's `/events/${uuid}` link, not migrated to a slug like locations/leagues.
//
// The left card used to have a status-colored heatmap (bidirectionally linked to the tournament
// cards below, like leagues/[leagueId]/index.vue's), replaced by EventsSingleDaySchedule.vue's hour
// grid ("like Google Calendar I can click and create a tournament"): a one-day schedule has no use
// for a multi-month heatmap's hover-linking, so that machinery was removed rather than kept dead

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

// The event page is mainly a calendar of its tournaments: a quick way into each tournament's page.
// "Settimana" shows every event day side by side, "Giorno" one at a time
const scheduleDays = computed(() =>
  event.value ? eventScheduleDays(event.value, tournaments.value) : [])

const scheduleView = ref<'day' | 'week'>('week')
const scheduleViewItems = computed<TabsItem[]>(() => [
  { label: t('event.detail.schedule.viewDay'), value: 'day', icon: ICONS.calendar },
  { label: t('event.detail.schedule.viewWeek'), value: 'week', icon: ICONS.tableView }
])

const selectedDay = ref<string>()
watch(scheduleDays, (days) => {
  if (!selectedDay.value || !days.includes(selectedDay.value)) selectedDay.value = days[0]
}, { immediate: true })
const dayItems = computed<TabsItem[]>(() => scheduleDays.value.map(day => ({
  label: new Date(`${day}T00:00:00`).toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric' }),
  value: day
})))

const visibleDays = computed(() => scheduleView.value === 'week' || !selectedDay.value
  ? scheduleDays.value
  : [selectedDay.value])

// DaySchedule.vue's click-to-create ("like Google Calendar"): one AddModal instance reused across
// every slot click, re-seeded each time via its initialDate/initialTime props (see that component's
// watch(open, ...))
const addModalOpen = ref(false)
const addModalInitialDate = ref<string>()
const addModalInitialTime = ref('20:00')
function openAddModalAt(date: string, time: string) {
  addModalInitialDate.value = date
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
        <UIcon :name="ICONS.loading" class="animate-spin text-3xl text-muted" />
      </div>

      <div v-else-if="event" class="flex flex-col gap-6">
        <UCard>
          <div class="flex flex-col gap-3">
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <h2 class="text-xl font-semibold truncate">
                  {{ event.name }}
                </h2>
                <p v-if="event.tagline || event.edition" class="text-sm text-muted">
                  <span v-if="event.edition" class="font-medium text-primary">
                    {{ t('event.details.editionLabel', { n: event.edition }) }}
                  </span>
                  <span v-if="event.edition && event.tagline"> · </span>
                  <span v-if="event.tagline" class="italic">{{ event.tagline }}</span>
                </p>
              </div>
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

            <EventsSingleDetails :event="event" />
          </div>
        </UCard>

        <UCard :ui="{ header: 'flex flex-wrap items-center justify-between gap-2' }">
          <template #header>
            <span class="font-semibold">{{ t('event.detail.schedule.title') }}</span>
            <div class="flex flex-wrap items-center gap-2">
              <ViewModeTabs
                v-if="scheduleView === 'day' && dayItems.length > 1"
                v-model="selectedDay"
                :items="dayItems"
              />
              <ViewModeTabs v-model="scheduleView" :items="scheduleViewItems" />
            </div>
          </template>

          <EventsSingleDaySchedule
            :days="visibleDays"
            :tournaments="tournaments"
            @create-tournament="openAddModalAt"
            @edit-tournament="openEditModal"
          />
        </UCard>

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
    :initial-date="addModalInitialDate ?? event.startDate.substring(0, 10)"
    :initial-time="addModalInitialTime"
    :initial-event-uuid="event.uuid"
  />
</template>
