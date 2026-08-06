<script lang="ts" setup>
import { sub } from 'date-fns'
import type { Range } from '~/types'

const { breadcrumbItems } = useBreadcrumbs()

const range = shallowRef<Range>({
  start: sub(new Date(), { days: 14 }),
  end: new Date()
})
</script>

<template>
  <UDashboardPanel id="tournaments">
    <template #header>
      <UDashboardNavbar :title="$t('eventTournamentsList.navbarTitle')">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <TournamentsListAddModal />
        </template>
      </UDashboardNavbar>

      <UDashboardToolbar>
        <template #left>
          <UBreadcrumb :items="breadcrumbItems" class="ms-2" />
        </template>
        <template #right>
          <!-- NOTE: The `-ms-1` class is used to align with the `DashboardSidebarCollapse` button here. -->
          <HomeDateRangePicker v-model="range" class="-ms-1" />
        </template>
      </UDashboardToolbar>
    </template>

    <template #body>
      <!-- <TournamentsTable :period="period" :range="range" /> -->
      <ul class="list-disc ms-4">
        <li>{{ $t('eventTournamentsList.body.allTournaments') }}</li>
        <li>{{ $t('eventTournamentsList.body.dateRangeFilter') }}</li>
      </ul>
      {{ $t('eventTournamentsList.body.filters') }}
      <ul class="list-disc ms-4">
        <li>{{ $t('eventTournamentsList.body.organizerFilter') }}</li>
        <li>{{ $t('eventTournamentsList.body.formatFilter') }}</li>
        <li>{{ $t('eventTournamentsList.body.locationFilter') }}</li>
      </ul>
      {{ $t('eventTournamentsList.body.tableDescription') }}
      <ul class="list-disc ms-4">
        <li>{{ $t('eventTournamentsList.body.date') }}</li>
        <li>{{ $t('eventTournamentsList.body.status') }}</li>
        <li>{{ $t('eventTournamentsList.body.organizer') }}</li>
        <li>{{ $t('eventTournamentsList.body.name') }}</li>
        <li>{{ $t('eventTournamentsList.body.links') }}</li>
        <li>{{ $t('eventTournamentsList.body.format') }}</li>
        <li>{{ $t('eventTournamentsList.body.participantCount') }}</li>
        <li>{{ $t('eventTournamentsList.body.winner') }}</li>
        <li>{{ $t('eventTournamentsList.body.detailsLink') }}</li>
      </ul>
    </template>
  </UDashboardPanel>
</template>
