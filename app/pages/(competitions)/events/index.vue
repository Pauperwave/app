<script lang="ts" setup>
import { sub } from 'date-fns'
import type { Range } from '~/types'
// import { h, resolveComponent } from 'vue'
// import type { TableColumn } from '@nuxt/ui'

const { breadcrumbItems } = useBreadcrumbs()
// const UBadge = resolveComponent('UBadge')

const range = shallowRef<Range>({
  start: sub(new Date(), { days: 14 }),
  end: new Date()
})

// type Event = {
//   id: number
//   uuid: string
//   league_uuid: string
//   league: 'Magman Autunno 2025'
//   organizer_uuid: string
//   status: 'Completed' | 'Scheduled' | 'Cancelled' | 'Postponed' | 'In Progress'
//   name: string
//   location: 'Magman'
//   date: string
//   starts_at: string
//   ends_at: string
//   entry_fee: number
//   description: string
//   prizes: string
//   notes: string
//   companion_app_code: string
//   created_at: string
//   updated_at: string
//   updated_by: string
// }

// const { data: events } = await useFetch('/api/events')
</script>

<template>
  <UDashboardPanel id="events">
    <template #header>
      <UDashboardNavbar title="Eventi">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <EventsListAddModal />
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
      Pagina eventi
    </template>
  </UDashboardPanel>
</template>
