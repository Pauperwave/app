<!-- app\pages\(competitions)\locations\[slug]\index.vue -->
<script lang="ts" setup>
// fallow-ignore-file code-duplication -- see the same comment in
// leagues/[leagueId]/index.vue
// First detail page for locations (2026-08-19 user request) — same shape as
// leagues/[leagueId]/index.vue (the first real, non-mock single page among
// tournaments/leagues/events): a header plus a filtered
// TournamentsListGridView below, read+edit only, no bulk actions/table view.
// The header is its own layout, not LocationsListCard.vue reused wholesale —
// that component's whole click behavior is "navigate to this detail page",
// which makes no sense as the detail page's own header (caught in review,
// 2026-08-19). Its smaller pieces (status badge, social links, placeholder)
// are reused directly instead. Slug-based, not uuid (2026-08-20, matching
// associate/[slug].vue and players/[slug]/index.vue) — location names are
// as stable as a person's name for this purpose (edited rarely, and only by
// staff), so there's no reason for this route to be the odd one out either.
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

// Overrides the raw slug path segment with the location's real name —
// location names can be multi-word/punctuated ("Smart Lab - Centro Giovani
// Rovereto"), which useBreadcrumbs.ts's generic hyphen-split+title-case
// fallback wouldn't round-trip cleanly (unlike a plain "First Last" person's
// name), so this override still earns its keep even slug-based.
const { breadcrumbItems } = useBreadcrumbs(
  computed(() => (location.value ? { [route.params.slug as string]: location.value.name } : {}))
)

const {
  data: tournamentsData, isLoading: tournamentsLoading, isPending: tournamentsPending,
  status, refetch
} = useTournamentsQuery()
const hostedTournaments = computed(() => (tournamentsData.value ?? [])
  .filter(tournament => tournament.locationUuid === location.value?.uuid))

// Independent of the range picker below — the heatmap spans its own dates
// (spanDates, same as leagues/[leagueId]/index.vue's own heatmap) rather
// than following the range picker, so it always shows the location's full
// hosting history regardless of what the grid underneath is filtered to.
const hostedTournamentDates = computed(() =>
  hostedTournaments.value.map(tournament => tournament.startDate))

// Same reasoning as leagues/[leagueId]/index.vue's own heatmap (user
// feedback, 2026-08-20): count-based intensity doesn't mean anything for
// tournaments — a location rarely hosts more than one a day — status does.
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

// Defaults to "Prossimo anno" (matches DateRangePicker's own next-year
// preset, 2026-08-23 — was "Tutto", same as tournaments/index.vue's own
// default change). A location with no upcoming tournaments now starts on an
// empty grid — a deliberate tradeoff for consistency with the other list
// pages, confirmed by user request over keeping "Tutto" here. Only the
// range is exposed here (not status/format, useTournamentsFilters.ts's other
// two) — this page only asked for a temporal filter, 2026-08-19.
const range = shallowRef<Range>({
  start: new Date(),
  end: add(new Date(), { years: 1 })
})
const {
  filteredTournaments: filteredHostedTournaments
} = useTournamentsFilters(hostedTournaments, range)

// Hovering/focusing a heatmap day highlights that day's tournament card
// below (same as leagues/[leagueId]/index.vue). Matched against the
// currently-filtered set, not the full history — a highlight for a card
// that isn't actually rendered (filtered out by the range picker) would be
// silently inert.
const hoveredTournamentDate = ref<string | null>(null)
const highlightedTournamentId = computed(() => filteredHostedTournaments.value.find(tournament =>
  toLocalDateKey(new Date(tournament.startDate)) === hoveredTournamentDate.value)?.id ?? null)

// The reverse direction (user request, 2026-08-20, "the other way around") —
// hovering a tournament card rings its matching heatmap day.
const hoveredCardTournament = shallowRef<Tournament | null>(null)
function handleCardHoverChange(tournament: Tournament | null) {
  hoveredCardTournament.value = tournament
}
const highlightedHeatmapDate = computed(() => hoveredCardTournament.value
  ? toLocalDateKey(new Date(hoveredCardTournament.value.startDate))
  : null)

// The tournaments grid renders its own per-card skeleton (loading prop
// below) instead of being gated behind the page-level spinner too — only
// the location-dependent shell (presentation card/heatmap/notFound) still
// waits on locationLoading. Same isPending-vs-isLoading reasoning as
// tournaments/index.vue: undefined (GridView's own default count) only on a
// genuine first load.
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
          <DateRangePicker v-model="range" />
        </template>
      </UDashboardToolbar>
    </template>

    <template #body>
      <div v-if="!locationLoading && !location" class="text-center py-12 text-muted">
        {{ t('location.detail.notFound') }}
      </div>

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

            <!-- Generic placeholder, not a per-cell skeleton — CalendarHeatmap
                 has no loading prop of its own (out of scope here), so this
                 just reserves its rendered footprint. isPending, not
                 isLoading (2026-08-22) — same fix as the table/grid views:
                 a background refresh keeps the real heatmap, only a
                 genuine first load shows the placeholder. -->
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

          <div
            v-if="!tournamentsPending && !filteredHostedTournaments.length"
            class="text-center py-12 text-muted"
          >
            {{ t('location.detail.hostedTournamentsEmpty') }}
          </div>

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
