<!-- app\pages\(competitions)\events\[eventId]\index.vue -->
<script lang="ts" setup>
// First real (non-mock) detail page for events (2026-08-20) — same shape as
// leagues/[leagueId]/index.vue and locations/[slug]/index.vue: an info card
// + a status-colored "Attività tornei" heatmap (bidirectionally linked to
// the tournament cards below, same as those two pages), read-only for now.
// No edit button/modal here — unlike League/Location, events have no
// EditModal.vue yet (only AddModal.vue exists), so this stays display-only
// rather than inventing that CRUD surface unprompted. Uuid-based, not
// slug-based — matches events/list/GridView.vue's own `/events/${uuid}` link,
// not migrated to a slug like locations/leagues were.
import type { Tournament } from '~/types'

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

const tournamentDates = computed(() => tournaments.value.map(tournament => tournament.startDate))

// Same reasoning as leagues/[leagueId]/index.vue's own heatmap (user
// feedback, 2026-08-20): count-based intensity doesn't mean anything for
// tournaments — status does.
const tournamentVariantByDate = computed(() => {
  const entries = tournaments.value.map(tournament => [
    toLocalDateKey(new Date(tournament.startDate)),
    { class: tournamentStatusBgClass(tournament.status), labelKey: `tournament.status.${tournament.status}` }
  ] as const)
  return Object.fromEntries(entries)
})

const tournamentLegendItems = TOURNAMENT_STATUSES.map(status => ({
  class: tournamentStatusBgClass(status),
  labelKey: `tournament.status.${status}`
}))

// Hovering/focusing a heatmap day highlights that day's tournament card
// below, and vice versa — same bidirectional linking as leagues/locations'
// own heatmaps.
const hoveredTournamentDate = ref<string | null>(null)
const highlightedTournamentId = computed(() => tournaments.value.find(tournament =>
  toLocalDateKey(new Date(tournament.startDate)) === hoveredTournamentDate.value)?.id ?? null)

const hoveredCardTournament = shallowRef<Tournament | null>(null)
function handleCardHoverChange(tournament: Tournament | null) {
  hoveredCardTournament.value = tournament
}
const highlightedHeatmapDate = computed(() => hoveredCardTournament.value
  ? toLocalDateKey(new Date(hoveredCardTournament.value.startDate))
  : null)

const loading = computed(() => eventLoading.value || tournamentsLoading.value)

const { rowContextMenuItems } = useCopyLinkContextMenu('/tournaments')
const { editingTournament, editModalOpen, openEditModal } = useTournamentsRowActions()
const selection = useSelection<number>()
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

          <UCard v-if="tournamentDates.length" :ui="{ header: 'font-semibold' }">
            <template #header>
              {{ t('event.detail.tournamentActivity') }}
            </template>

            <div class="flex justify-center">
              <CalendarHeatmap
                v-model:hovered-date="hoveredTournamentDate"
                :dates="tournamentDates"
                span-dates
                :variant-by-date="tournamentVariantByDate"
                :legend-items="tournamentLegendItems"
                :highlighted-date="highlightedHeatmapDate"
              />
            </div>
          </UCard>
        </div>

        <TournamentsListGridView
          :tournaments="tournaments"
          :context-menu-items="rowContextMenuItems"
          :on-edit="openEditModal"
          :selection="selection"
          :highlighted-tournament-id="highlightedTournamentId"
          :on-hover-change="handleCardHoverChange"
        />
      </div>

      <div v-else class="text-center py-12 text-muted">
        {{ t('event.detail.notFound') }}
      </div>
    </template>
  </UDashboardPanel>

  <TournamentsListEditModal v-model="editModalOpen" :tournament="editingTournament" />
</template>
