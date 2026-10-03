<!-- app\pages\(competitions)\locations\[slug]\index.vue -->
<script lang="ts" setup>
// fallow-ignore-file code-duplication -- see the same comment in leagues/[leagueId]/index.vue
// The first detail page for locations, shaped like leagues/[leagueId]/index.vue (a header plus a
// filtered TournamentsListGridView below, read+edit only, no bulk actions/table view). The header
// is its own layout, not LocationsListCard.vue reused wholesale: that component's click behavior is
// "navigate to this detail page", which makes no sense as the detail page's own header. Its smaller
// pieces (status badge, social links, placeholder) are reused directly. Slug-based, not uuid (like
// associate/[slug].vue and players/[slug]/index.vue): location names are as stable as a person's
// name for this purpose (edited rarely, only by staff)
import { add } from 'date-fns'
import type { Range, Tournament } from '~/types'

// Was nav-hidden only — see locations/index.vue's own comment.
definePageMeta({ permission: 'manage-locations' })

const { t } = useI18n()
const route = useRoute()

const {
  data: locationsData, isLoading: locationLoading, isPending: locationPending
} = useLocationsQuery()
const location = computed(() => locationsData.value?.find(
  item => slugify(item.name) === route.params.slug) ?? null)

useSeoMeta({ title: () => location.value?.name ?? t('location.breadcrumb') })

// Same precise-link-over-address-search-fallback priority as
// LocationsListCard.vue's own mapsLink.
const mapsLink = computed(() => location.value
  ? (location.value.googleMapsUrl ?? googleMapsUrl(location.value.address))
  : null)
const addressLine = computed(() => location.value
  ? `${location.value.address}, ${location.value.postalCode} ${location.value.city} ${location.value.province}`
  : '')

// Overrides the raw slug path segment with the location's real name: names can be
// multi-word/punctuated ("Smart Lab - Centro Giovani Rovereto"), which useBreadcrumbs.ts's generic
// hyphen-split+title-case fallback wouldn't round-trip (unlike a plain "First Last" name), so the
// override earns its keep even slug-based
const { breadcrumbItems } = useBreadcrumbs(
  computed(() => (location.value ? { [route.params.slug as string]: location.value.name } : {}))
)

const {
  data: tournamentsData, isLoading: tournamentsLoading, isPending: tournamentsPending,
  status, refetch
} = useTournamentsQuery()
const hostedTournaments = computed(() => (tournamentsData.value ?? [])
  .filter(tournament => tournament.locationUuid === location.value?.uuid))

// Independent of the range picker below: the heatmap spans its own dates (spanDates, like
// leagues/[leagueId]/index.vue's heatmap) rather than following the range picker, so it always
// shows the location's full hosting history whatever the grid is filtered to
const hostedTournamentDates = computed(() =>
  hostedTournaments.value.map(tournament => tournament.startDate))

// Same as leagues/[leagueId]/index.vue's heatmap: count-based intensity is meaningless for
// tournaments (a location rarely hosts more than one a day), status is not
const hostedTournamentVariantByDate = computed(() => {
  const entries = hostedTournaments.value.map(tournament => [
    toLocalDateKey(new Date(tournament.startDate)),
    { class: tournamentStatusBgClass(tournament.status), labelKey: `tournament.status.${tournament.status}` }
  ] as const)
  return Object.fromEntries(entries)
})

const hostedTournamentLegendItems = TOURNAMENT_STATUSES.map(status => ({
  class: tournamentStatusBgClass(status),
  labelKey: `tournament.status.${status}`
}))

// Defaults to "Prossimo anno" (DateRangePicker's next-year preset, like tournaments/index.vue). A
// location with no upcoming tournaments starts on an empty grid: a deliberate tradeoff for
// consistency with the other list pages. Only the range is exposed (not status/format,
// useTournamentsFilters.ts's other two): this page only needs a temporal filter
const range = shallowRef<Range>({
  start: new Date(),
  end: add(new Date(), { years: 1 })
})
const {
  filteredTournaments: filteredHostedTournaments
} = useTournamentsFilters(hostedTournaments, range)

// Year quick-jump next to DateRangePicker (YearRangePicker.vue), scoped to this location's hosted
// tournaments, like hostedTournamentDates above
const availableYears = computed(() => availableTournamentYears(hostedTournaments.value))

// Hovering/focusing a heatmap day highlights that day's tournament card below (like
// leagues/[leagueId]/index.vue). Matched against the currently filtered set, not the full history:
// a highlight for a card filtered out by the range picker would be silently inert
const hoveredTournamentDate = ref<string | null>(null)
const highlightedTournamentId = computed(() => filteredHostedTournaments.value.find(tournament =>
  toLocalDateKey(new Date(tournament.startDate)) === hoveredTournamentDate.value)?.id ?? null)

// The reverse direction: hovering a tournament card rings its matching heatmap day
const hoveredCardTournament = shallowRef<Tournament | null>(null)
function handleCardHoverChange(tournament: Tournament | null) {
  hoveredCardTournament.value = tournament
}
const highlightedHeatmapDate = computed(() => hoveredCardTournament.value
  ? toLocalDateKey(new Date(hoveredCardTournament.value.startDate))
  : null)

// The tournaments grid renders its own per-card skeleton (loading prop below) instead of waiting
// behind the page-level spinner: only the location-dependent shell (presentation
// card/heatmap/notFound) waits on locationLoading. Same isPending-vs-isLoading reasoning as
// tournaments/index.vue: undefined (GridView's default count) only on a genuine first load
const skeletonCount = computed(() =>
  (tournamentsPending.value ? undefined : filteredHostedTournaments.value.length))

const { rowContextMenuItems } = useCopyLinkContextMenu('/tournaments')
const {
  editingTournament, editModalOpen: tournamentEditModalOpen, openEditModal: openTournamentEditModal
} = useTournamentsRowActions()
const selection = useSelection<number>()

const {
  editingLocation, editModalOpen: locationEditModalOpen, openEditModal: openLocationEditModal
} = useLocationsRowActions()
</script>

<template>
  <UDashboardPanel id="location">
    <template #header>
      <UDashboardNavbar :title="location?.name ?? $t('location.detail.navbarTitle')">
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

        <template #right>
          <YearRangePicker v-model="range" :years="availableYears" />
        </template>
      </UDashboardToolbar>
    </template>

    <template #body>
      <EmptyState
        v-if="!locationLoading && !location"
        :message="t('location.detail.notFound')"
      />

      <div v-else class="flex flex-col gap-6">
        <div class="grid gap-6 sm:grid-cols-2 sm:items-start">
          <LocationsSinglePresentationCard
            :location="location"
            :maps-link="mapsLink"
            :address-line="addressLine"
            :on-edit="openLocationEditModal"
            :loading="locationPending"
          />

          <UCard
            v-if="locationPending || hostedTournamentDates.length"
            :ui="{ header: 'font-semibold' }"
          >
            <template #header>
              {{ t('location.detail.tournamentActivity') }}
            </template>

            <!-- Generic placeholder, not a per-cell skeleton: CalendarHeatmap has no loading
                 prop of its own, so this just reserves its footprint. isPending, not isLoading,
                 like the table/grid views: a background refresh keeps the real heatmap, only a
                 genuine first load shows the placeholder -->
            <USkeleton v-if="locationPending" class="h-40 w-full max-w-md mx-auto" />

            <div v-else class="flex justify-center">
              <CalendarHeatmap
                v-model:hovered-date="hoveredTournamentDate"
                :dates="hostedTournamentDates"
                span-dates
                :variant-by-date="hostedTournamentVariantByDate"
                :legend-items="hostedTournamentLegendItems"
                :highlighted-date="highlightedHeatmapDate"
              />
            </div>
          </UCard>
        </div>

        <div>
          <h3 class="font-semibold mb-3">
            {{ t('location.detail.hostedTournaments') }}
          </h3>

          <EmptyState
            v-if="!tournamentsPending && !filteredHostedTournaments.length"
            :message="t('location.detail.hostedTournamentsEmpty')"
          />

          <TournamentsListGridView
            v-else
            :tournaments="filteredHostedTournaments"
            :context-menu-items="rowContextMenuItems"
            :on-edit="openTournamentEditModal"
            :selection="selection"
            :highlighted-tournament-id="highlightedTournamentId"
            :on-hover-change="handleCardHoverChange"
            :loading="tournamentsPending"
            :loading-count="skeletonCount"
          />
        </div>
      </div>
    </template>
  </UDashboardPanel>

  <TournamentsListEditModal v-model="tournamentEditModalOpen" :tournament="editingTournament" />
  <LocationsListEditModal v-model="locationEditModalOpen" :location="editingLocation" />
</template>
