<script lang="ts" setup>
import { sub } from 'date-fns'
import type { Range } from '~/types'

const range = shallowRef<Range>({
  start: sub(new Date(), { days: 14 }),
  end: new Date()
})
</script>

<template>
  <UDashboardPanel id="tournaments">
    <template #header>
      <UDashboardNavbar title="Tournaments">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <TournamentsAddModal />
        </template>
      </UDashboardNavbar>

      <UDashboardToolbar>
        <template #left>
          <!-- NOTE: The `-ms-1` class is used to align with the `DashboardSidebarCollapse` button here. -->
          <HomeDateRangePicker v-model="range" class="-ms-1" />
        </template>
      </UDashboardToolbar>
    </template>
  </UDashboardPanel>
</template>
