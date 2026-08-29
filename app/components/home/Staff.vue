<!-- app\components\home\Staff.vue -->
<!--
  Home body for organizer/admin/super_admin (docs/PROGRESS.md ADR pending —
  see the 2026-08-19 "Home" conversation): a single shared dashboard, not one
  component per staff role — organizer/admin/super_admin differ only in
  *which sections of the app they can reach* (access-settings, manage-roles),
  never in what this dashboard itself shows. Every section here is real
  data — no mock domains involved (tournaments/events/transactions are all
  migrated, see CLAUDE.md).
-->
<script setup lang="ts">
import { isFuture, isToday } from 'date-fns'

const { t } = useI18n()

// wanted-cards excluded from pendingActions on purpose (user feedback,
// 2026-08-19): staff neither moderates nor helps fulfil these requests — it's
// a player-to-player board, nothing here is actually "pending" on staff for
// it. Its open count still shows up below as a passive stat, not an action.
const {
  pendingAssociatesCount, associatesCount, associatesToRenewCount, wantedCardsSearchingCount
} = useHomeActionCounts()

const pendingActions = computed(() => [{
  label: t('home.staff.pendingActions.requests'),
  count: pendingAssociatesCount.value,
  icon: ICONS.inbox,
  to: '/associates/requests'
}, {
  label: t('home.staff.pendingActions.renewals'),
  count: associatesToRenewCount.value,
  icon: ICONS.refresh,
  to: '/associates'
}])

const { data: tournaments } = useTournamentsQuery()
const { data: events } = useEventsQuery()

// "Upcoming" = today or later, not already wrapped up — same status set a
// tournament/event never goes back to once reached.
const upcomingTournamentsList = computed(() => upcomingTournaments(tournaments.value ?? []))

const upcomingEventsCount = computed(() => (events.value ?? [])
  .filter(event => event.status !== 'completed' && event.status !== 'cancelled'
    && (isToday(new Date(event.startDate)) || isFuture(new Date(event.startDate))))
  .length)

const { data: transactions } = useTransactionsQuery()
const recentTransactions = computed(() => (transactions.value ?? []).slice(0, 5))

const { data: locations } = useLocationsQuery()

// Same 'associates' Pinia Colada key as useHomeActionCounts.ts's own, no
// extra fetch — most recently approved, not most recently requested
// (association_date is set on approval, request_date on submission).
const { data: associates } = useAssociatesQuery()
const recentAssociates = computed(() => (associates.value ?? [])
  .filter(associate => associate.membership_request_status === 'approved' && associate.association_date)
  .sort((a, b) => new Date(b.association_date!).getTime() - new Date(a.association_date!).getTime())
  .slice(0, 5))

// Venue of the very next upcoming tournament — upcomingTournaments is
// already sorted ascending by starts_at (useTournamentsQuery.ts's own
// ordering), so [0] is the soonest one, not an arbitrary pick.
const nextTournamentLocation = computed(() => upcomingTournamentsList.value[0] ?? null)

const { data: leagues } = useLeaguesQuery()
const activeLeagues = computed(() => (leagues.value ?? [])
  .filter(league => league.status !== 'completed' && league.status !== 'cancelled')
  .slice(0, 5))

const stats = computed(() => [{
  title: t('home.staff.stats.activeAssociates'),
  icon: ICONS.players,
  value: associatesCount.value,
  to: '/associates'
}, {
  title: t('home.staff.stats.openWantedCards'),
  icon: ICONS.cardSearch,
  value: wantedCardsSearchingCount.value,
  to: '/wanted-cards'
}, {
  title: t('home.staff.stats.upcomingTournaments'),
  icon: ICONS.battle,
  value: upcomingTournamentsList.value.length,
  to: '/tournaments'
}, {
  title: t('home.staff.stats.upcomingEvents'),
  icon: ICONS.calendar,
  value: upcomingEventsCount.value,
  to: '/events'
}, {
  title: t('home.staff.stats.locations'),
  icon: ICONS.mapPin,
  value: (locations.value ?? []).length,
  to: '/locations'
}])
</script>

<template>
  <div class="flex flex-col gap-6">
    <UPageGrid id="tour-home-stats" class="sm:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-6 lg:gap-px">
      <UPageCard
        v-for="stat in stats"
        :key="stat.title"
        :icon="stat.icon"
        :title="stat.title"
        :to="stat.to"
        variant="subtle"
        :ui="{
          container: 'gap-y-1.5',
          wrapper: 'items-start',
          leading: 'p-2.5 rounded-full bg-primary/10 ring ring-inset ring-primary/25 flex-col',
          title: 'font-normal text-muted text-xs uppercase'
        }"
        class="lg:rounded-none first:rounded-l-lg last:rounded-r-lg hover:z-1"
      >
        <span class="text-2xl font-semibold text-highlighted">{{ stat.value }}</span>
      </UPageCard>
    </UPageGrid>

    <div>
      <h3 class="font-semibold mb-3">
        {{ t('home.staff.sections.upcoming') }}
      </h3>

      <div class="grid grid-cols-1 lg:grid-cols-3 items-stretch gap-4 sm:gap-6">
        <HomeStaffPendingActionsCard :actions="pendingActions" />
        <HomeStaffUpcomingTournamentsCard :tournaments="upcomingTournamentsList" />
        <HomeStaffNextLocationCard :tournament="nextTournamentLocation" />
      </div>
    </div>

    <div>
      <h3 class="font-semibold mb-3">
        {{ t('home.staff.sections.recentActivity') }}
      </h3>

      <div class="grid grid-cols-1 lg:grid-cols-3 items-stretch gap-4 sm:gap-6">
        <HomeStaffActiveLeaguesCard :leagues="activeLeagues" />
        <HomeStaffRecentTransactionsCard :transactions="recentTransactions" />
        <HomeStaffRecentAssociatesCard :associates="recentAssociates" />
      </div>
    </div>
  </div>
</template>
