<!-- app\pages\(competitions)\events\[eventId]\tournaments\index.vue -->
<script lang="ts" setup>
import { sub } from 'date-fns'
import type { Range } from '~/types'

const { breadcrumbItems } = useBreadcrumbs()
const route = useRoute()

const range = shallowRef<Range>({
  start: sub(new Date(), { days: 14 }),
  end: new Date()
})
</script>

<template>
  <UDashboardPanel id="tournaments">
    <template #header>
      <UDashboardNavbar :title="$t('event.tournamentsList.navbarTitle')">
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
          <!-- NOTE: The `-ms-1` class aligns with the `DashboardSidebarCollapse` button here. -->
          <HomeDateRangePicker v-model="range" class="-ms-1" />
        </template>
      </UDashboardToolbar>
    </template>

    <template #body>
      <!-- <TournamentsTable :period="period" :range="range" /> -->
      <ul class="list-disc ms-4">
        <li>{{ $t('event.tournamentsList.body.allTournaments') }}</li>
        <li>{{ $t('event.tournamentsList.body.dateRangeFilter') }}</li>
      </ul>
      {{ $t('event.tournamentsList.body.filters') }}
      <ul class="list-disc ms-4">
        <li>{{ $t('event.tournamentsList.body.organizerFilter') }}</li>
        <li>{{ $t('event.tournamentsList.body.formatFilter') }}</li>
        <li>{{ $t('event.tournamentsList.body.locationFilter') }}</li>
      </ul>
      {{ $t('event.tournamentsList.body.tableDescription') }}
      <ul class="list-disc ms-4">
        <li>{{ $t('event.tournamentsList.body.date') }}</li>
        <li>{{ $t('event.tournamentsList.body.status') }}</li>
        <li>{{ $t('event.tournamentsList.body.organizer') }}</li>
        <li>{{ $t('event.tournamentsList.body.name') }}</li>
        <li>{{ $t('event.tournamentsList.body.links') }}</li>
        <li>{{ $t('event.tournamentsList.body.format') }}</li>
        <li>{{ $t('event.tournamentsList.body.participantCount') }}</li>
        <li>{{ $t('event.tournamentsList.body.winner') }}</li>
        <li>{{ $t('event.tournamentsList.body.detailsLink') }}</li>
      </ul>

      <!-- TODO: temporary, remove once the table with real data
           replaces this placeholder -->
      <UButton
        :to="`/events/${route.params.eventId}/tournaments/1`"
        variant="outline"
        color="neutral"
        class="mt-4"
        icon="i-lucide-chevron-right"
      >
        {{ $t('common.dummyLinkLabel') }}
      </UButton>
    </template>
  </UDashboardPanel>
</template>
