<!-- app\components\home\HomeStaff.vue -->
<!--
  Home body for organizer/admin/super_admin (docs/PROGRESS.md ADR pending —
  see the 2026-08-19 "Home" conversation): a single shared dashboard, not one
  component per staff role — organizer/admin/super_admin differ only in
  *which sections of the app they can reach* (access-settings, manage-roles),
  never in what this operational dashboard itself shows. Every section here
  is real data — no mock domains involved (tournaments/events/transactions
  are all migrated, see CLAUDE.md).
-->
<script setup lang="ts">
import { isFuture, isToday } from 'date-fns'

const { t } = useI18n()
const { can } = useUserRole()

// wanted-cards excluded on purpose (user feedback, 2026-08-19): staff neither
// moderates nor helps fulfil these requests — it's a player-to-player board,
// nothing here is actually "pending" on staff for it.
const { pendingAssociatesCount, associatesCount, associatesToRenewCount } = useHomeActionCounts()

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
const upcomingTournaments = computed(() => (tournaments.value ?? [])
  .filter(tournament => tournament.status !== 'completed' && tournament.status !== 'cancelled'
    && (isToday(new Date(tournament.startDate)) || isFuture(new Date(tournament.startDate))))
  .slice(0, 5))

const upcomingEventsCount = computed(() => (events.value ?? [])
  .filter(event => event.status !== 'completed' && event.status !== 'cancelled'
    && (isToday(new Date(event.startDate)) || isFuture(new Date(event.startDate))))
  .length)

const { data: transactions } = useTransactionsQuery()
const recentTransactions = computed(() => (transactions.value ?? []).slice(0, 5))

const amountFormatter = new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' })

const stats = computed(() => [{
  title: t('home.staff.stats.activeAssociates'),
  icon: ICONS.players,
  value: associatesCount.value,
  to: '/associates'
}, {
  title: t('home.staff.stats.upcomingTournaments'),
  icon: ICONS.battle,
  value: upcomingTournaments.value.length,
  to: '/tournaments'
}, {
  title: t('home.staff.stats.upcomingEvents'),
  icon: ICONS.calendar,
  value: upcomingEventsCount.value,
  to: '/events'
}])
</script>

<template>
  <div class="flex flex-col gap-6">
    <UPageGrid class="lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-px">
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

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
      <UPageCard :title="t('home.staff.pendingActions.title')" variant="subtle">
        <div class="flex flex-col divide-y divide-default">
          <NuxtLink
            v-for="action in pendingActions"
            :key="action.label"
            :to="action.to"
            class="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0 hover:text-highlighted"
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

      <UPageCard :title="t('home.staff.upcoming.title')" variant="subtle">
        <div v-if="!upcomingTournaments.length" class="text-sm text-muted py-4 text-center">
          {{ t('home.staff.upcoming.empty') }}
        </div>

        <div v-else class="flex flex-col divide-y divide-default">
          <NuxtLink
            v-for="tournament in upcomingTournaments"
            :key="tournament.uuid"
            :to="tournamentDetailUrl(tournament)"
            class="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0 hover:text-highlighted"
          >
            <div class="min-w-0">
              <p class="text-sm font-medium truncate">{{ tournament.name }}</p>
              <p class="text-xs text-muted">
                {{ tournament.format }} ·
                <DateWithRelativeTooltip :iso-string="tournament.startDate" :time="false" />
              </p>
            </div>
            <UBadge
              :color="tournamentStatusColor(tournament.status)"
              :icon="TOURNAMENT_STATUS_ICONS[tournament.status]"
              variant="subtle"
              class="shrink-0"
            >
              {{ t(`tournament.status.${tournament.status}`) }}
            </UBadge>
          </NuxtLink>
        </div>
      </UPageCard>

      <UPageCard :title="t('home.staff.recentTransactions.title')" variant="subtle">
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
    </div>

    <!-- Super_admin only (manage-roles) — organizer/admin see the rest of
         this dashboard identically, this is the one section that's genuinely
         gated by capability, not just a nav-visibility permission. -->
    <UPageCard
      v-if="can('manage-roles')"
      :title="t('home.staff.roleManagement.title')"
      :description="t('home.staff.roleManagement.description')"
      variant="subtle"
      to="/settings/members"
      orientation="horizontal"
      class="max-w-md"
    >
      <template #leading>
        <UIcon :name="ICONS.permissions" class="size-6 text-muted" />
      </template>
    </UPageCard>
  </div>
</template>
