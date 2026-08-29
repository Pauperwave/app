<!-- app\pages\(competitions)\leagues\[leagueId]\index.vue -->
<script lang="ts" setup>
// First real (non-mock) detail page among tournaments/leagues/events singles
// (2026-08-16) — clicking a tournament card's league link lands here. Reuses
// TournamentsListGridView as-is: same cards, and (2026-08-29) the same
// edit/copy/delete context menu as /tournaments itself, just pre-filtered to
// this league's tournaments. No bulk-selection actions bar / table toggle
// here yet — delete/copy act on a single tournament at a time.
import type { DropdownMenuItem } from '@nuxt/ui'
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
  data: tournamentsData, isLoading: tournamentsLoading, isPending: tournamentsPending,
  status, refetch
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

// The tournaments grid renders its own per-card skeleton (loading prop
// below) instead of being gated behind the page-level spinner too — only
// the league-dependent top row (presentation card/heatmap/leaderboard)
// still waits on leagueLoading, since none of those have a skeleton yet.
// Same isPending-vs-isLoading reasoning as tournaments/index.vue: undefined
// (GridView's own default count) only on a genuine first load.
const skeletonCount = computed(() =>
  (tournamentsPending.value ? undefined : tournaments.value.length))

// tableContextMenuItems/onRowContextmenu aren't needed here — this
// league-scoped page has no table view (grid only, at least for now).
const { rowContextMenuItems } = useCopyLinkContextMenu<Tournament>('/tournaments')
const { editingTournament, editModalOpen, openEditModal } = useTournamentsRowActions()
const selection = useSelection<number>()
const {
  requestDelete, pendingAction, confirmOpen: bulkConfirmOpen, confirmPendingAction
} = useTournamentsBulkActions(selection)

// "Copia torneo" (user request, 2026-08-29) — same reusable-instance
// convention as tournaments/index.vue's own copy action.
const copyModalOpen = ref(false)
const copySourceTournament = shallowRef<Tournament | null>(null)
function openCopyModal(tournament: Tournament) {
  copySourceTournament.value = tournament
  copyModalOpen.value = true
}

// Same edit/copy/delete additions as tournaments/index.vue's own
// tournamentContextMenuItems() (user request, 2026-08-29, "same
// functionality as /tournaments' context menu") — this page previously only
// had the shared copy-link/copy-id items.
function tournamentContextMenuItems(tournament: Tournament): DropdownMenuItem[] {
  return [
    ...rowContextMenuItems(tournament),
    { type: 'separator' },
    {
      label: t('tournament.rowActions.edit'),
      icon: ICONS.edit,
      onSelect: () => openEditModal(tournament)
    },
    {
      label: t('tournament.rowActions.copy'),
      icon: ICONS.copy,
      onSelect: () => openCopyModal(tournament)
    },
    { type: 'separator' },
    {
      label: t('tournament.rowActions.delete'),
      icon: ICONS.delete,
      color: 'error',
      onSelect: () => requestDelete([tournament])
    }
  ]
}

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

// Reverse direction of the tournaments-side "assign to league" bulk action
// (LeaguesSingleAddTournamentsModal.vue's own comment) — only meaningful
// once the league itself is known, same reasoning as the modal needing a
// real `league` prop rather than the nullable computed directly.
const addTournamentsModalOpen = ref(false)

// "Nuovo torneo" (user request, 2026-08-29) — distinct from the button
// above: that one assigns *existing* tournaments to this league, this one
// creates a brand new one already linked to it via
// TournamentsListAddModal's own initialLeagueUuid prop (same pattern as
// events/[eventId]/index.vue's own click-to-create AddModal).
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

        <!-- :loading is isPending, not isLoading (2026-08-22) — same fix as
             the table/grid list pages: a background refresh keeps the real
             cards, only a genuine first load shows the skeleton grid. -->
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
