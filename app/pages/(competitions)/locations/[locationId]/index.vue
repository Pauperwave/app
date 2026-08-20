<!-- app\pages\(competitions)\locations\[locationId]\index.vue -->
<script lang="ts" setup>
// First detail page for locations (2026-08-19 user request) — same shape as
// leagues/[leagueId]/index.vue (the first real, non-mock single page among
// tournaments/leagues/events): a header plus a filtered
// TournamentsListGridView below, read+edit only, no bulk actions/table view.
// The header is its own layout, not LocationsListCard.vue reused wholesale —
// that component's whole click behavior is "navigate to this detail page",
// which makes no sense as the detail page's own header (caught in review,
// 2026-08-19). Its smaller pieces (status badge, social links, placeholder)
// are reused directly instead.
import { add, sub } from 'date-fns'
import type { Range } from '~/types'

const { t } = useI18n()
const route = useRoute()
const locationUuid = computed(() => route.params.locationId as string)

const { data: locationsData, isLoading: locationLoading } = useLocationsQuery()
const location = computed(() =>
  locationsData.value?.find(item => item.uuid === locationUuid.value) ?? null)

useSeoMeta({ title: () => location.value?.name ?? t('location.breadcrumb') })

// Same precise-link-over-address-search-fallback priority as
// LocationsListCard.vue's own mapsLink.
const mapsLink = computed(() => location.value
  ? (location.value.googleMapsUrl ?? googleMapsUrl(location.value.address))
  : null)
const addressLine = computed(() => location.value
  ? `${location.value.address}, ${location.value.postalCode} ${location.value.city} ${location.value.province}`
  : '')

// Overrides the raw uuid path segment with the location's real name — see
// useBreadcrumbs.ts's own comment on why this can't be derived from the URL.
const { breadcrumbItems } = useBreadcrumbs(
  computed(() => (location.value ? { [locationUuid.value]: location.value.name } : {}))
)

const {
  data: tournamentsData, isLoading: tournamentsLoading, status, refetch
} = useTournamentsQuery()
const hostedTournaments = computed(() => (tournamentsData.value ?? [])
  .filter(tournament => tournament.locationUuid === locationUuid.value))

// Defaults to "Tutto" (matches HomeDateRangePicker's own "all time" range),
// same reasoning as tournaments/index.vue's own default — a location that's
// hosted tournaments for years shouldn't start on an empty grid. Only the
// range is exposed here (not status/format, useTournamentsFilters.ts's other
// two) — this page only asked for a temporal filter, 2026-08-19.
const range = shallowRef<Range>({
  start: sub(new Date(), { years: 10 }),
  end: add(new Date(), { years: 10 })
})
const {
  filteredTournaments: filteredHostedTournaments
} = useTournamentsFilters(hostedTournaments, range)

const loading = computed(() => locationLoading.value || tournamentsLoading.value)

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
          <HomeDateRangePicker v-model="range" />
        </template>
      </UDashboardToolbar>
    </template>

    <template #body>
      <div v-if="loading" class="flex items-center justify-center py-12">
        <UIcon name="i-lucide-loader-circle" class="animate-spin text-3xl text-muted" />
      </div>

      <div v-else-if="location" class="flex flex-col gap-6">
        <UCard :ui="{ body: 'p-0 sm:p-0' }" class="overflow-hidden">
          <div class="flex flex-col sm:flex-row">
            <!-- Sibling of the dimmed img/placeholder, not a descendant: CSS
                 opacity applies to a whole subtree, so the badge has to sit
                 outside it to render at full strength on top (same fix as
                 the grid card's own LocationsListLocationStatus). -->
            <div class="relative shrink-0 w-full sm:w-64">
              <img
                v-if="location.image"
                :src="location.image"
                :alt="location.name"
                class="w-full h-48 sm:h-full object-cover"
                :class="{ 'opacity-60 saturate-50': location.temporarilyClosed }"
              >
              <ImageOffPlaceholder
                v-else
                class="w-full h-48 sm:h-full"
                :class="{ 'opacity-60 saturate-50': location.temporarilyClosed }"
                icon-class="size-10"
              />

              <UBadge
                v-if="location.temporarilyClosed"
                color="warning"
                variant="subtle"
                :icon="ICONS.warning"
                class="absolute top-2 left-2 z-10"
              >
                {{ t('location.card.temporarilyClosed') }}
              </UBadge>
            </div>

            <div
              class="p-6 flex-1 min-w-0"
              :class="{ 'opacity-60 saturate-50': location.temporarilyClosed }"
            >
              <div class="flex items-start justify-between gap-3">
                <h2 class="text-xl font-semibold truncate">
                  {{ location.name }}
                </h2>

                <UButton
                  :label="t('location.rowActions.edit')"
                  :icon="ICONS.edit"
                  color="neutral"
                  variant="subtle"
                  size="sm"
                  class="shrink-0"
                  @click="openLocationEditModal(location)"
                />
              </div>

              <p class="flex items-center gap-1.5 text-sm text-muted mt-2">
                <UIcon :name="ICONS.mapPin" class="size-4 shrink-0" />
                <span>{{ addressLine }}</span>
                <a
                  v-if="mapsLink"
                  :href="mapsLink"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="text-primary hover:underline"
                >
                  {{ t('location.card.openInMaps') }}
                </a>
              </p>

              <p v-if="location.phone" class="flex items-center gap-1.5 text-sm text-muted mt-1">
                <UIcon :name="ICONS.phone" class="size-4 shrink-0" />
                {{ location.phone }}
              </p>

              <LocationsListSocialLinks :location="location" />
            </div>
          </div>
        </UCard>

        <div>
          <h3 class="font-semibold mb-3">
            {{ t('location.detail.hostedTournaments') }}
          </h3>

          <div v-if="!filteredHostedTournaments.length" class="text-center py-12 text-muted">
            {{ t('location.detail.hostedTournamentsEmpty') }}
          </div>

          <TournamentsListGridView
            v-else
            :tournaments="filteredHostedTournaments"
            :context-menu-items="rowContextMenuItems"
            :on-edit="openTournamentEditModal"
            :selection="selection"
          />
        </div>
      </div>

      <div v-else class="text-center py-12 text-muted">
        {{ t('location.detail.notFound') }}
      </div>
    </template>
  </UDashboardPanel>

  <TournamentsListEditModal v-model="tournamentEditModalOpen" :tournament="editingTournament" />
  <LocationsListEditModal v-model="locationEditModalOpen" :location="editingLocation" />
</template>
