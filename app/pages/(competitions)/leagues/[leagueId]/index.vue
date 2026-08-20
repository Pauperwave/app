<!-- app\pages\(competitions)\leagues\[leagueId]\index.vue -->
<script lang="ts" setup>
// First real (non-mock) detail page among tournaments/leagues/events singles
// (2026-08-16) — clicking a tournament card's league link lands here. Reuses
// TournamentsListGridView as-is: same cards, same edit/context-menu wiring
// as /tournaments, just pre-filtered to this league's tournaments. No bulk
// actions bar / table toggle here yet — this page is read+edit only for now.
import type { Tournament } from '~/types'

const { t } = useI18n()
const route = useRoute()
const leagueUuid = computed(() => route.params.leagueId as string)

const { data: leaguesData, isLoading: leagueLoading } = useLeaguesQuery()
const league = computed(() =>
  leaguesData.value?.find(item => item.uuid === leagueUuid.value) ?? null)

useSeoMeta({ title: () => league.value?.name ?? t('league.breadcrumb') })

// Overrides the raw uuid path segment with the league's real name — see
// useBreadcrumbs.ts's own comment on why this can't be derived from the URL.
const { breadcrumbItems } = useBreadcrumbs(
  computed(() => (league.value ? { [leagueUuid.value]: league.value.name } : {}))
)

const {
  data: tournamentsData, isLoading: tournamentsLoading, status, refetch
} = useTournamentsQuery()
const tournaments = computed(() => (tournamentsData.value ?? [])
  .filter(tournament => tournament.leagueUuid === leagueUuid.value))

// Same reasoning as locations/[slug]/index.vue's own tournament heatmap —
// this page has no date-range filter to stay independent of, but the
// heatmap's own trailing-12-months window still applies regardless.
const tournamentDates = computed(() => tournaments.value.map(tournament => tournament.startDate))

// Count-based intensity (the heatmap's own default) doesn't mean anything
// here — a league rarely runs more than one tournament a day, so it just
// collapses to "none" vs. "high" (user feedback, 2026-08-20: "è più una
// questione di stato dei tornei"). Color each day by its tournament's status
// instead, reusing the exact same status → color mapping as everywhere else
// tournament status is shown (tournamentStatusColor/tournamentStatusBgClass).
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
// below (user request, 2026-08-20) — keyed by the same toLocalDateKey() both
// sides use, so no separate id lookup table is needed.
const hoveredTournamentDate = ref<string | null>(null)
const highlightedTournamentId = computed(() => tournaments.value.find(tournament =>
  toLocalDateKey(new Date(tournament.startDate)) === hoveredTournamentDate.value)?.id ?? null)

// The reverse direction (user request, 2026-08-20, "the other way around") —
// hovering a tournament card rings its matching heatmap day. A separate ref
// from hoveredTournamentDate above so the two directions don't fight over
// the same piece of state.
const hoveredCardTournament = shallowRef<Tournament | null>(null)
function handleCardHoverChange(tournament: Tournament | null) {
  hoveredCardTournament.value = tournament
}
const highlightedHeatmapDate = computed(() => hoveredCardTournament.value
  ? toLocalDateKey(new Date(hoveredCardTournament.value.startDate))
  : null)

// League has no endDate column of its own (app/types/index.d.ts) — the card
// shows "Dal <league.startDate> al <last tournament's date>" instead, since
// that's the closest real signal for when the league actually wraps up.
const leagueEndDate = computed(() => tournamentDates.value.length
  ? [...tournamentDates.value].sort().at(-1)!
  : null)

const loading = computed(() => leagueLoading.value || tournamentsLoading.value)

// Only rowContextMenuItems is needed here — tableContextMenuItems/
// onRowContextmenu are for the table view, which this league-scoped page
// doesn't have (grid only, at least for now).
const { rowContextMenuItems } = useCopyLinkContextMenu('/tournaments')
const { editingTournament, editModalOpen, openEditModal } = useTournamentsRowActions()
const selection = useSelection<number>()

const {
  editingLeague, editModalOpen: leagueEditModalOpen, openEditModal: openLeagueEditModal
} = useLeaguesRowActions()

// Grid rows size to the *tallest* column by default — with 40 mock
// leaderboard rows that meant the whole page grew to fit them instead of the
// leaderboard being capped to the shorter presentation+heatmap column and
// scrolling internally (CSS alone can't make one grid item's content bound a
// sibling's max-height, only measurement can). Mirrors the left column's own
// rendered height onto the leaderboard card at `sm:grid-cols-2` and up. Below
// that the columns stack instead of sitting side by side, so there's no
// sibling height to match — but the card still shouldn't be left to grow
// unbounded there either, so it falls back to a fixed cap instead.
// Rough budget for the card's own header (~3.5rem) plus 8 rows at their
// natural py-2 height (~2.75rem each) — an estimate, not a pixel-exact
// figure, since the rows' own height isn't fixed.
const MOBILE_LEADERBOARD_MAX_HEIGHT = `${3.5 + 8 * 2.75}rem`

const leftColumnRef = useTemplateRef('leftColumn')
const isSideBySide = useMediaQuery('(min-width: 640px)')
const leftColumnHeight = ref<number>()
useResizeObserver(leftColumnRef, ([entry]) => {
  leftColumnHeight.value = entry?.contentRect.height
})
const leaderboardMaxHeight = computed(() => isSideBySide.value && leftColumnHeight.value
  ? `${leftColumnHeight.value}px`
  : MOBILE_LEADERBOARD_MAX_HEIGHT)
</script>

<template>
  <UDashboardPanel id="league">
    <template #header>
      <UDashboardNavbar :title="league?.name ?? $t('league.detail.navbarTitle')">
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

      <div v-else class="flex flex-col gap-6">
        <div class="grid gap-4 sm:grid-cols-2 sm:items-start">
          <div ref="leftColumn" class="flex flex-col gap-4">
            <LeaguesSinglePresentationCard
              v-if="league"
              :league="league"
              :end-date="leagueEndDate"
              :on-edit="openLeagueEditModal"
            />

            <UCard v-if="tournamentDates.length" :ui="{ header: 'font-semibold' }">
              <template #header>
                {{ t('league.detail.tournamentActivity') }}
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

          <!-- PREVIEW ONLY (2026-08-20) — see LeaguesSingleLeaderboard.vue's
               own comment: hardcoded mock rows, not real data yet. Capped to
               the left column's own measured height (see leaderboardMaxHeight
               above) with an internal scroll, not left free to push the whole
               page taller than the presentation + heatmap cards combined. -->
          <UCard
            :style="{ maxHeight: leaderboardMaxHeight }"
            :ui="{
              root: 'flex flex-col',
              header: 'font-semibold',
              body: 'flex-1 min-h-0 overflow-y-auto'
            }"
          >
            <template #header>
              {{ t('league.singleLeaderboard') }}
            </template>

            <LeaguesSingleLeaderboard />
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
    </template>
  </UDashboardPanel>

  <TournamentsListEditModal v-model="editModalOpen" :tournament="editingTournament" />
  <LeaguesListEditModal v-model="leagueEditModalOpen" :league="editingLeague" />
</template>
