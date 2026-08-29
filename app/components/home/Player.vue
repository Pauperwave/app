<!-- app\components\home\Player.vue -->
<!--
  Home body for the 'player' role (docs/PROGRESS.md ADR pending — see the
  2026-08-19 "Home" conversation): personal status, not an operational
  dashboard — radically different content from Staff.vue, not just a
  permission-gated subset of it, hence the separate component.
-->
<script setup lang="ts">
import { isFuture, isToday } from 'date-fns'

const { t } = useI18n()

const currentAssociate = useCurrentAssociate()

const {
  renewingAssociate, renewModalOpen, openRenewModal
} = useAssociatesRowActions()

// Same "pay vs renew" wording split as useAssociatesRowActions.ts's own
// context-menu item — 'unpaid' means approved but never paid a first fee,
// which "rinnova" would misdescribe.
const renewButtonLabel = computed(() => currentAssociate.value?.membership_status === 'unpaid'
  ? t('associate.rowActions.pay')
  : t('associate.rowActions.renew'))
const renewButtonIcon = computed(() => currentAssociate.value?.membership_status === 'unpaid'
  ? ICONS.receipt
  : ICONS.refresh)
const needsRenewal = computed(() => currentAssociate.value
  ? currentAssociate.value.membership_status !== 'active'
  : false)

const { data: transactions } = useTransactionsQuery()
const myTransactions = computed(() => (transactions.value ?? [])
  .filter(transaction => transaction.associate?.uuid === currentAssociate.value?.uuid))
const myTotalPaid = computed(() => myTransactions.value
  .reduce((sum, transaction) => sum + transaction.payment_amount, 0))
const recentTransactions = computed(() => myTransactions.value.slice(0, 3))

const amountFormatter = AMOUNT_FORMATTER

const { data: tournaments } = useTournamentsQuery()
const upcomingTournaments = computed(() => (tournaments.value ?? [])
  .filter(tournament => tournament.status !== 'completed' && tournament.status !== 'cancelled'
    && (isToday(new Date(tournament.startDate)) || isFuture(new Date(tournament.startDate))))
  .slice(0, 5))
</script>

<template>
  <div class="flex flex-col gap-6">
    <UPageCard
      id="tour-home-membership"
      :title="t('home.player.membership.title')"
      variant="subtle"
    >
      <div v-if="!currentAssociate" class="text-sm text-muted py-2">
        {{ t('home.player.membership.noAssociate') }}
      </div>

      <div v-else class="flex items-center justify-between gap-3 flex-wrap">
        <div class="flex items-center gap-3">
          <MembershipStatusBadge :status="currentAssociate.membership_status" />
          <span v-if="currentAssociate.pauperwave_associate_number" class="text-sm text-muted">
            {{ t('associate.columns.pauperwaveAssociateNumber') }}:
            {{ currentAssociate.pauperwave_associate_number }}
          </span>
        </div>

        <UButton
          v-if="needsRenewal"
          :label="renewButtonLabel"
          :icon="renewButtonIcon"
          color="primary"
          size="sm"
          @click="openRenewModal(currentAssociate)"
        />
      </div>
    </UPageCard>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
      <UPageCard id="tour-home-payments" :title="t('home.player.payments.title')" variant="subtle">
        <div v-if="!currentAssociate" class="text-sm text-muted py-4 text-center">
          {{ t('home.player.membership.noAssociate') }}
        </div>

        <template v-else>
          <p class="text-2xl font-semibold text-highlighted mb-3">
            {{ amountFormatter.format(myTotalPaid) }}
          </p>

          <div v-if="!recentTransactions.length" class="text-sm text-muted py-2">
            {{ t('home.player.payments.empty') }}
          </div>

          <div v-else class="flex flex-col divide-y divide-default">
            <div
              v-for="transaction in recentTransactions"
              :key="transaction.id"
              class="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0"
            >
              <PaymentTypeBadge :type="transaction.payment_type" />
              <div class="flex items-center gap-2 text-sm text-muted">
                <DateWithRelativeTooltip :iso-string="transaction.payment_date" :time="false" />
                <span class="font-medium text-highlighted">
                  {{ amountFormatter.format(transaction.payment_amount) }}
                </span>
              </div>
            </div>
          </div>
        </template>
      </UPageCard>

      <UPageCard id="tour-home-upcoming" :title="t('home.player.upcoming.title')" variant="subtle">
        <div v-if="!upcomingTournaments.length" class="text-sm text-muted py-4 text-center">
          {{ t('home.player.upcoming.empty') }}
        </div>

        <div v-else class="flex flex-col divide-y divide-default">
          <div
            v-for="tournament in upcomingTournaments"
            :key="tournament.uuid"
            class="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
          >
            <div class="min-w-0">
              <NuxtLink :to="tournamentDetailUrl(tournament)" class="text-sm font-medium truncate hover:underline">
                {{ tournament.name }}
                <TournamentsStageLabel
                  v-if="tournament.stageNumber"
                  :number="tournament.stageNumber"
                />
              </NuxtLink>
              <p class="text-xs text-muted">
                {{ tournament.format }} ·
                <DateWithRelativeTooltip :iso-string="tournament.startDate" :time="false" />
              </p>
            </div>
            <CalendarButtonRegisterButton />
          </div>
        </div>
      </UPageCard>
    </div>

    <UPageCard
      id="tour-home-rankings"
      :title="t('home.player.rankings.title')"
      variant="subtle"
      to="/standings/cittadino"
    >
      <div class="text-sm text-muted py-4 text-center">
        {{ t('common.pageInDevelopment') }}
      </div>
    </UPageCard>
  </div>

  <TransactionsListAddModal
    v-model="renewModalOpen"
    :preset-associate="renewingAssociate"
    hide-trigger
  />
</template>
