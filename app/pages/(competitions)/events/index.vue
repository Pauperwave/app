<script lang="ts" setup>
import { sub } from 'date-fns'
import type { Range } from '~/types'

const { breadcrumbItems } = useBreadcrumbs()

const range = shallowRef<Range>({
  start: sub(new Date(), { days: 14 }),
  end: new Date()
})

const { data: events } = await useFetch('/api/events')
</script>

<template>
  <UDashboardPanel id="events">
    <template #header>
      <UDashboardNavbar title="Eventi">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <EventsAddModal />
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
      <ul class="list-disc ms-4">
        <li>Panoramica eventi</li>
        <li>TODO: Lista tutti gli eventi con filtri per data e stato</li>
        <li>Visualizza dettagli evento</li>
        <li>Aggiungi nuovo evento</li>
        <li>Filtra eventi per periodo selezionato</li>
      </ul>

      <UTable :data="events" class="flex-1" />
    </template>
  </UDashboardPanel>
</template>
