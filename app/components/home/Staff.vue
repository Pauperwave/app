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

const amountFormatter = AMOUNT_FORMATTER

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
        <UPageCard
          id="tour-home-pending-actions"
          :title="t('home.staff.pendingActions.title')"
          variant="subtle"
        >
          <div class="flex flex-col divide-y divide-default">
            <NuxtLink
              v-for="action in pendingActions"
              :key="action.label"
              :to="action.to"
              class="flex items-center justify-between gap-3 -mx-2 px-2 py-3 first:pt-0 last:pb-0
                rounded-md hover:bg-elevated/50 hover:text-highlighted"
            >
              <span class="flex items-center gap-2 text-sm">
                <UIcon :name="action.icon" class="size-4 text-muted shrink-0" />
                {{ action.label }}
              </span>
              <UBadge :color="action.count > 0 ? 'warning' : 'neutral'" variant="subtle" class="shrink-0">
                {{ action.count }}
              </UBadge>
            </NuxtLink>
          </div>
        </UPageCard>

        <UPageCard id="tour-home-upcoming" :title="t('home.staff.upcoming.title')" variant="subtle">
          <div v-if="!upcomingTournamentsList.length" class="text-sm text-muted py-4 text-center">
            {{ t('home.staff.upcoming.empty') }}
          </div>

          <div v-else class="flex flex-col divide-y divide-default">
            <NuxtLink
              v-for="tournament in upcomingTournamentsList"
              :key="tournament.uuid"
              :to="tournamentDetailUrl(tournament)"
              class="flex items-center justify-between gap-3 -mx-2 px-2 py-3 first:pt-0 last:pb-0
                rounded-md hover:bg-elevated/50 hover:text-highlighted"
            >
              <div class="min-w-0">
                <p class="text-sm font-medium truncate">
                  {{ tournament.name }}
                  <TournamentsStageLabel
                    v-if="tournament.stageNumber"
                    :number="tournament.stageNumber"
                  />
                </p>
                <p class="text-sm text-muted">
                  {{ tournament.format }} ·
                  <DateWithRelativeTooltip :iso-string="tournament.startDate" :time="false" />
                </p>
              </div>
              <TournamentsStatusBadge :tournament="tournament" />
            </NuxtLink>
          </div>
        </UPageCard>

        <UPageCard
          id="tour-home-next-location"
          :title="t('home.staff.nextLocation.title')"
          variant="subtle"
        >
          <div v-if="!nextTournamentLocation?.location" class="text-sm text-muted py-4 text-center">
            {{ t('home.staff.nextLocation.empty') }}
          </div>

          <div v-else class="flex items-start gap-3">
            <UIcon :name="ICONS.mapPin" class="size-5 text-muted shrink-0 mt-0.5" />
            <div class="min-w-0">
              <p class="text-sm font-medium">
                {{ nextTournamentLocation.location }}
              </p>
              <p class="text-sm text-muted">
                {{ nextTournamentLocation.locationAddress }}
              </p>
              <a
                v-if="nextTournamentLocation.locationMapsUrl"
                :href="nextTournamentLocation.locationMapsUrl"
                target="_blank"
                rel="noopener noreferrer"
                class="text-sm text-primary hover:underline"
              >
                {{ t('location.card.openInMaps') }}
              </a>
            </div>
          </div>
        </UPageCard>
      </div>
    </div>

    <div>
      <h3 class="font-semibold mb-3">
        {{ t('home.staff.sections.recentActivity') }}
      </h3>

      <div class="grid grid-cols-1 lg:grid-cols-3 items-stretch gap-4 sm:gap-6">
        <UPageCard
          id="tour-home-active-leagues"
          :title="t('home.staff.activeLeagues.title')"
          variant="subtle"
        >
          <div v-if="!activeLeagues.length" class="text-sm text-muted py-4 text-center">
            {{ t('home.staff.activeLeagues.empty') }}
          </div>

          <div v-else class="flex flex-col divide-y divide-default">
            <NuxtLink
              v-for="league in activeLeagues"
              :key="league.uuid"
              :to="`/leagues/${league.uuid}`"
              class="flex items-center justify-between gap-3 -mx-2 px-2 py-3 first:pt-0 last:pb-0
                rounded-md hover:bg-elevated/50 hover:text-highlighted"
            >
              <span class="text-sm font-medium truncate">{{ league.name }}</span>
              <LeaguesStatusBadge :league="league" />
            </NuxtLink>
          </div>
        </UPageCard>

        <UPageCard
          id="tour-home-recent-transactions"
          :title="t('home.staff.recentTransactions.title')"
          variant="subtle"
        >
          <div v-if="!recentTransactions.length" class="text-sm text-muted py-4 text-center">
            {{ t('home.staff.recentTransactions.empty') }}
          </div>

          <div v-else class="flex flex-col divide-y divide-default">
            <NuxtLink
              v-for="transaction in recentTransactions"
              :key="transaction.id"
              to="/transactions"
              class="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0 hover:text-highlighted"
            >
              <AssociateTag
                :name="transactionPayerName(transaction)"
                :associate-uuid="transaction.associate?.uuid"
              />
              <div class="flex items-center gap-2 shrink-0">
                <PaymentTypeBadge :type="transaction.payment_type" />
                <span class="text-sm font-medium">
                  {{ amountFormatter.format(transaction.payment_amount) }}
                </span>
              </div>
            </NuxtLink>
          </div>
        </UPageCard>

        <UPageCard
          id="tour-home-recent-associates"
          :title="t('home.staff.recentAssociates.title')"
          variant="subtle"
        >
          <div v-if="!recentAssociates.length" class="text-sm text-muted py-4 text-center">
            {{ t('home.staff.recentAssociates.empty') }}
          </div>

          <div v-else class="flex flex-col divide-y divide-default">
            <NuxtLink
              v-for="associate in recentAssociates"
              :key="associate.uuid"
              :to="`/associate/${slugify(`${associate.first_name} ${associate.last_name}`)}`"
              class="flex items-center justify-between gap-3 -mx-2 px-2 py-3 first:pt-0 last:pb-0
                rounded-md hover:bg-elevated/50 hover:text-highlighted"
            >
              <AssociateTag
                :name="`${associate.first_name} ${associate.last_name}`"
                :associate-uuid="associate.uuid"
              />
              <DateWithRelativeTooltip
                :iso-string="associate.association_date"
                :time="false"
                class="text-sm text-muted shrink-0"
              />
            </NuxtLink>
          </div>
        </UPageCard>
      </div>
    </div>
  </div>
</template>
