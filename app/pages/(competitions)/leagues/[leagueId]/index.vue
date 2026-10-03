<!-- app\pages\(competitions)\leagues\[leagueId]\index.vue -->
<script lang="ts" setup>
// fallow-ignore-file code-duplication -- header shell mirrors every other detail page
// The UDashboardPanel/Navbar/Toolbar/breadcrumb shell (route-param/useBreadcrumbs/refetch wiring)
// is shared by locations/[slug], events/[eventId] and players/[slug]; each page's #right toolbar
// and body differ per domain, so a shared header component would need as many slots/conditionals as
// it saves lines. The first real (non-mock) detail page among tournaments/leagues/events singles: a
// tournament card's league link lands here. It reuses TournamentsListGridView as-is (the same cards
// and edit/copy/delete context menu as /tournaments), pre-filtered to this league's tournaments. No
// bulk-selection bar / table toggle yet: delete/copy act on one tournament at a time.
import type { Tournament } from '~/types'

const { t } = useI18n()
const route = useRoute()
const leagueUuid = computed(() => route.params.leagueId as string)

const { data: leaguesData, isLoading: leagueLoading } = useLeaguesQuery()
const league = computed(() =>
  leaguesData.value?.find(item => item.uuid === leagueUuid.value) ?? null)

useSeoMeta({ title: () => league.value?.name ?? t('league.breadcrumb') })

// Overrides the raw uuid path segment with the league's real name (see useBreadcrumbs.ts on why it
// can't be derived from the URL)
const { breadcrumbItems } = useBreadcrumbs(
  computed(() => (league.value ? { [leagueUuid.value]: league.value.name } : {}))
)

const {
  data: tournamentsData, isLoading: tournamentsLoading, isPending: tournamentsPending,
  status, refetch
} = useTournamentsQuery()
const tournaments = computed(() => (tournamentsData.value ?? [])
  .filter(tournament => tournament.leagueUuid === leagueUuid.value))

// Same reasoning as locations/[slug]/index.vue's own tournament heatmap —
// this page has no date-range filter to stay independent of, but the
// heatmap's own trailing-12-months window still applies regardless.
const tournamentDates = computed(() => tournaments.value.map(tournament => tournament.startDate))

// Count-based intensity (the heatmap's default) is meaningless here: a league rarely runs more than
// one tournament a day, so it collapses to "none" vs "high". Each day is colored by its
// tournament's status instead, reusing the status → color mapping used everywhere tournament status
// is shown (tournamentStatusColor/tournamentStatusBgClass)
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

// Hovering/focusing a heatmap day highlights that day's tournament card below, keyed by the same
// toLocalDateKey() both sides use (no separate id lookup)
const hoveredTournamentDate = ref<string | null>(null)
const highlightedTournamentId = computed(() => tournaments.value.find(tournament =>
  toLocalDateKey(new Date(tournament.startDate)) === hoveredTournamentDate.value)?.id ?? null)

// The reverse direction: hovering a tournament card rings its matching heatmap day. A separate ref
// from hoveredTournamentDate so the two directions don't fight over one piece of state
const hoveredCardTournament = shallowRef<Tournament | null>(null)
function handleCardHoverChange(tournament: Tournament | null) {
  hoveredCardTournament.value = tournament
}
const highlightedHeatmapDate = computed(() => hoveredCardTournament.value
  ? toLocalDateKey(new Date(hoveredCardTournament.value.startDate))
  : null)

// League has no endDate column (app/types/index.d.ts): the card shows "Dal <league.startDate> al
// <last tournament's date>", the closest real signal for when the league wraps up
const leagueEndDate = computed(() => tournamentDates.value.length
  ? [...tournamentDates.value].sort().at(-1)!
  : null)

// The tournaments grid renders its own per-card skeleton (loading prop below) instead of waiting
// behind the page-level spinner: only the league-dependent top row (presentation
// card/heatmap/leaderboard, none with a skeleton yet) waits on leagueLoading. Same
// isPending-vs-isLoading reasoning as tournaments/index.vue: undefined (GridView's default count)
// only on a genuine first load
const skeletonCount = computed(() =>
  (tournamentsPending.value ? undefined : tournaments.value.length))

// tableContextMenuItems/onRowContextmenu aren't needed: this league-scoped page has no table view
// (grid only, for now)
const { rowContextMenuItems } = useCopyLinkContextMenu<Tournament>('/tournaments')
const { editingTournament, editModalOpen, openEditModal } = useTournamentsRowActions()
const selection = useSelection<number>()
const {
  requestDelete, pendingAction, confirmOpen: bulkConfirmOpen, confirmPendingAction
} = useTournamentsBulkActions(selection)

// "Copia torneo": the same reusable-instance convention as tournaments/index.vue's copy action
const { copyModalOpen, copySourceTournament, openCopyModal } = useTournamentCopyModal()

// The same edit/copy/delete additions as tournaments/index.vue, shared via
// useTournamentContextMenuItems.ts
const { tournamentContextMenuItems } = useTournamentContextMenuItems(
  rowContextMenuItems, openEditModal, openCopyModal, requestDelete
)

const {
  editingLeague, editModalOpen: leagueEditModalOpen, openEditModal: openLeagueEditModal
} = useLeaguesRowActions()

// Grid rows size to the *tallest* column by default: with 40 mock leaderboard rows the whole page
// grew to fit them instead of the leaderboard being capped to the shorter presentation+heatmap
// column and scrolling internally (CSS alone can't make one grid item's content bound a sibling's
// max-height, only measurement can). Mirrors the left column's rendered height onto the leaderboard
// card at `sm:grid-cols-2` and up. Below that the columns stack, so there is no sibling height to
// match, but the card shouldn't grow unbounded either, so it falls back to a fixed cap: a rough
// budget for its header (~3.5rem) plus 8 rows at their natural py-2 height (~2.75rem each), an
// estimate since row height isn't fixed
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

// The reverse of the tournaments-side "assign to league" bulk action (see
// LeaguesSingleAddTournamentsModal.vue): only meaningful once the league is known, like the modal
// needing a real `league` prop rather than the nullable computed
const addTournamentsModalOpen = ref(false)

// "Nuovo torneo", distinct from the button above (which assigns *existing* tournaments to this
// league): it creates a new one already linked via TournamentsListAddModal's initialLeagueUuid
// prop, like events/[eventId]/index.vue's click-to-create AddModal
const addTournamentModalOpen = ref(false)
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

        <template #right>
          <template v-if="league">
            <UButton
              :label="$t('league.detail.addTournaments.button')"
              :icon="ICONS.battle"
              color="neutral"
              variant="subtle"
              @click="addTournamentsModalOpen = true"
            />
            <UButton
              :label="$t('tournament.addModal.openButton')"
              :icon="ICONS.add"
              @click="addTournamentModalOpen = true"
            />
          </template>
        </template>
      </UDashboardToolbar>
    </template>

    <template #body>
      <div v-if="leagueLoading" class="flex items-center justify-center py-12">
        <UIcon :name="ICONS.loading" class="animate-spin text-3xl text-muted" />
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

          <!-- PREVIEW ONLY (see LeaguesSingleLeaderboard.vue): hardcoded mock rows, not real
               data. Capped to the left column's measured height (see leaderboardMaxHeight
               above) with an internal scroll, not left free to push the page taller than the
               presentation + heatmap cards -->
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

        <!-- :loading is isPending, not isLoading, like the table/grid list pages: a background
             refresh keeps the real cards, only a genuine first load shows the skeleton grid -->
        <TournamentsListGridView
          :tournaments="tournaments"
          :context-menu-items="tournamentContextMenuItems"
          :on-edit="openEditModal"
          :selection="selection"
          :highlighted-tournament-id="highlightedTournamentId"
          :on-hover-change="handleCardHoverChange"
          :loading="tournamentsPending"
          :loading-count="skeletonCount"
        />
      </div>
    </template>
  </UDashboardPanel>

  <TournamentsListEditModal v-model="editModalOpen" :tournament="editingTournament" />
  <LeaguesListEditModal v-model="leagueEditModalOpen" :league="editingLeague" />
  <LeaguesSingleAddTournamentsModal
    v-if="league"
    v-model="addTournamentsModalOpen"
    :league="league"
  />
  <TournamentsListAddModal
    v-if="league"
    v-model="addTournamentModalOpen"
    hide-trigger
    :initial-league-uuid="league.uuid"
  />
  <TournamentsListAddModal
    v-model="copyModalOpen"
    hide-trigger
    :source-tournament="copySourceTournament"
  />

  <ConfirmModal
    v-model:open="bulkConfirmOpen"
    :title="t('tournament.bulkActions.confirmDeleteTitle', pendingAction?.tournaments.length ?? 0)"
    :warning="t('common.confirmDeleteWarning')"
    :confirm-label="t('tournament.rowActions.delete')"
    confirm-color="error"
    :confirm-icon="ICONS.delete"
    @confirm="confirmPendingAction"
  >
    <ul v-if="pendingAction" class="max-h-40 overflow-y-auto text-sm space-y-1">
      <li v-for="tournament in pendingAction.tournaments" :key="tournament.id">
        {{ tournament.name }}
        <TournamentsStageLabel v-if="tournament.stageNumber" :number="tournament.stageNumber" />
      </li>
    </ul>
  </ConfirmModal>
</template>
